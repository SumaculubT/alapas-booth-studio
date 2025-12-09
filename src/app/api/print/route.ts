import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';

// Print API Route for Epson L3210 and other printers
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { image, printSettings, printerName } = body;

    if (!image) {
      return NextResponse.json(
        { error: 'Image data is required' },
        { status: 400 }
      );
    }

    // Load print settings with defaults
    const settings = printSettings || {
      paperSize: '4x6',
      orientation: 'landscape',
      dpi: 300,
      margins: 'small',
      scaleMode: 'fit',
    };

    // Extract base64 image data (remove data:image/png;base64, prefix if present)
    const base64Data = image.includes(',') ? image.split(',')[1] : image;
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Option 1: PrintNode Integration (Cloud Printing Service)
    if (process.env.PRINTNODE_API_KEY) {
      return await printViaPrintNode(imageBuffer, settings, printerName || undefined, body.image);
    }

    // Option 2: Local Printer via System Command (Windows/Linux/Mac)
    if (process.env.ENABLE_LOCAL_PRINTING === 'true') {
      return await printViaLocalPrinter(imageBuffer, settings, printerName);
    }

    // Option 3: Return instructions for setup
    return NextResponse.json({
      success: false,
      message: 'Print service not configured. Please set up PrintNode or enable local printing.',
      setupInstructions: {
        printNode: {
          steps: [
            '1. Sign up at https://www.printnode.com',
            '2. Install PrintNode Client on the machine with your Epson L3210',
            '3. Add your PrintNode API key to .env.local as PRINTNODE_API_KEY',
          ],
        },
        local: {
          steps: [
            '1. Ensure your Epson L3210 is installed and accessible',
            '2. Set ENABLE_LOCAL_PRINTING=true in .env.local',
            '3. On Windows, the printer should be accessible via system commands',
          ],
        },
      },
    });
  } catch (error: any) {
    console.error('Print error:', error);
    return NextResponse.json(
      { error: 'Failed to print', details: error.message },
      { status: 500 }
    );
  }
}

// PrintNode Integration
async function printViaPrintNode(
  imageBuffer: Buffer,
  settings: any,
  printerName: string | undefined,
  originalImageData: string
) {
  const apiKey = process.env.PRINTNODE_API_KEY;
  const baseUrl = 'https://api.printnode.com';

  try {
    // Get available printers
    const printersResponse = await fetch(`${baseUrl}/printers`, {
      headers: {
        Authorization: `Basic ${Buffer.from(apiKey + ':').toString('base64')}`,
      },
    });

    if (!printersResponse.ok) {
      throw new Error('Failed to fetch printers from PrintNode');
    }

    const printers = await printersResponse.json();
    
    // Find printer by name (case-insensitive, partial matching)
    let targetPrinter;
    if (printerName) {
      const searchName = printerName.toLowerCase();
      // Try exact match first, then partial match
      targetPrinter = printers.find((p: any) => 
        p.name.toLowerCase() === searchName ||
        p.name.toLowerCase().includes(searchName) ||
        searchName.includes(p.name.toLowerCase())
      );
      
      // If still not found, try matching key parts (e.g., "L3210" should match "EPSON L3210 Series")
      if (!targetPrinter) {
        const searchParts = searchName.split(/\s+/).filter(part => part.length > 2);
        targetPrinter = printers.find((p: any) => {
          const printerNameLower = p.name.toLowerCase();
          return searchParts.some(part => printerNameLower.includes(part));
        });
      }
    } else {
      // Default: try to find Epson L3210
      targetPrinter = printers.find((p: any) => 
        p.name.toLowerCase().includes('l3210') || 
        p.name.toLowerCase().includes('epson')
      );
    }

    if (!targetPrinter) {
      return NextResponse.json({
        error: 'Printer not found',
        message: `Could not find printer matching "${printerName}". Please check the printer name.`,
        availablePrinters: printers.map((p: any) => p.name),
      }, { status: 404 });
    }

    // Calculate paper dimensions
    const paperDims = getPaperDimensions(settings.paperSize, settings);
    const marginInches = getMarginInches(settings.margins, settings);

    // PrintNode requires PDF format for images - convert image to PDF
    const pdfBase64 = await convertImageToPdf(imageBuffer, paperDims, settings);
    
    // Create print job with pdf_base64 content type
    const printJob = {
      printerId: targetPrinter.id,
      title: 'Photo Strip Print',
      contentType: 'pdf_base64',
      content: pdfBase64,
      source: 'Alpas Studio',
      printJobOptions: {
        paper: paperDims.name || `${paperDims.width}x${paperDims.height}`,
        orientation: settings.orientation || 'landscape',
        copies: 1,
        dpi: settings.dpi || 300,
        fit_to_page: true, // Ensure image fits on page
      },
    };

    const jobResponse = await fetch(`${baseUrl}/printjobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(apiKey + ':').toString('base64')}`,
      },
      body: JSON.stringify(printJob),
    });

    if (!jobResponse.ok) {
      const error = await jobResponse.text();
      throw new Error(`PrintNode error: ${error}`);
    }

    const jobData = await jobResponse.json();

    return NextResponse.json({
      success: true,
      message: 'Print job submitted successfully',
      jobId: jobData.id,
      printer: targetPrinter.name,
    });
  } catch (error: any) {
    console.error('PrintNode error:', error);
    return NextResponse.json(
      { error: 'PrintNode printing failed', details: error.message },
      { status: 500 }
    );
  }
}

// Local Printer Integration (Windows/Linux/Mac)
async function printViaLocalPrinter(
  imageBuffer: Buffer,
  settings: any,
  printerName?: string
) {
  // This would require system-specific implementation
  // For Windows, you could use PowerShell or a library
  // For Linux/Mac, you could use CUPS or lp command
  
  return NextResponse.json({
    success: false,
    message: 'Local printing requires system-specific implementation',
    note: 'This feature requires additional setup based on your operating system',
  });
}

function getPaperDimensions(paperSize: string, settings: any) {
  switch (paperSize) {
    case '4x6':
      return { width: 4, height: 6, name: '4x6' };
    case '5x7':
      return { width: 5, height: 7, name: '5x7' };
    case '8x10':
      return { width: 8, height: 10, name: '8x10' };
    case 'custom':
      return {
        width: settings.customWidth || 4,
        height: settings.customHeight || 6,
        name: 'custom',
      };
    default:
      return { width: 4, height: 6, name: '4x6' };
  }
}

function getMarginInches(margins: string, settings: any) {
  switch (margins) {
    case 'none':
      return 0;
    case 'small':
      return 0.1;
    case 'medium':
      return 0.25;
    case 'large':
      return 0.5;
    case 'custom':
      return settings.customMargin || 0.1;
    default:
      return 0.1;
  }
}

// Convert image buffer to PDF base64 for PrintNode
// Creates a PDF with the image embedded using pdf-lib
async function convertImageToPdf(
  imageBuffer: Buffer,
  paperDims: { width: number; height: number },
  settings: any
): Promise<string> {
  try {
    // Paper size in points (72 points = 1 inch)
    const widthPoints = paperDims.width * 72;
    const heightPoints = paperDims.height * 72;
    
    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    
    // Add a page with custom size
    const page = pdfDoc.addPage([widthPoints, heightPoints]);
    
    // Detect image format
    const isJpeg = imageBuffer[0] === 0xFF && imageBuffer[1] === 0xD8;
    const isPng = imageBuffer[0] === 0x89 && imageBuffer[1] === 0x50;
    
    // Embed the image
    let image;
    if (isJpeg) {
      image = await pdfDoc.embedJpg(imageBuffer);
    } else if (isPng) {
      image = await pdfDoc.embedPng(imageBuffer);
    } else {
      // Try PNG as default
      image = await pdfDoc.embedPng(imageBuffer);
    }
    
    // Get image dimensions
    const imageDims = image.scale(1);
    
    // Calculate scaling to fit page
    const scaleX = widthPoints / imageDims.width;
    const scaleY = heightPoints / imageDims.height;
    const scale = Math.min(scaleX, scaleY);
    
    // Center the image on the page
    const scaledWidth = imageDims.width * scale;
    const scaledHeight = imageDims.height * scale;
    const x = (widthPoints - scaledWidth) / 2;
    const y = (heightPoints - scaledHeight) / 2;
    
    // Draw the image
    page.drawImage(image, {
      x: x,
      y: y,
      width: scaledWidth,
      height: scaledHeight,
    });
    
    // Generate PDF as base64
    const pdfBytes = await pdfDoc.save();
    const pdfBase64 = Buffer.from(pdfBytes).toString('base64');
    
    return pdfBase64;
  } catch (error: any) {
    throw new Error(`Failed to convert image to PDF: ${error.message}`);
  }
}

