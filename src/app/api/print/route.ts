import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

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

    // Use local printing (no internet connection required)
      return await printViaLocalPrinter(imageBuffer, settings, printerName);
  } catch (error: any) {
    console.error('Print error:', error);
    return NextResponse.json(
      { error: 'Failed to print', details: error.message },
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
  try {
    const platform = os.platform();
    const paperDims = getPaperDimensions(settings.paperSize, settings);
    const tempDir = os.tmpdir();
    let tempFilePath: string;
    let printCommand: string;

    if (platform === 'win32') {
      // Windows: Save as PNG/JPG and print via mspaint (built-in, no extra deps)
      // Note: mspaint.exe uses the printer's default settings. To control:
      // - Paper size (4x6, borderless, etc.)
      // - Paper type (Epson Matte, etc.)
      // - Quality settings
      // - Orientation
      // Set these as default preferences in Windows Printer Properties
      const imageExt = imageBuffer[0] === 0xFF && imageBuffer[1] === 0xD8 ? 'jpg' : 'png';
      tempFilePath = path.join(tempDir, `print-${Date.now()}.${imageExt}`);
      fs.writeFileSync(tempFilePath, imageBuffer);
    
      // mspaint supports /p (default printer) and /pt (specific printer)
      const quotedPath = `"${tempFilePath}"`;
    if (printerName) {
        // /pt "<file>" "<printer>"
        const quotedPrinter = `"${printerName.replace(/"/g, '\\"')}"`;
        // If /pt fails (invalid printer), fall back to default printer (/p)
        printCommand = `cmd /C "mspaint.exe /pt ${quotedPath} ${quotedPrinter} || mspaint.exe /p ${quotedPath}"`;
      } else {
        // /p "<file>" prints to default printer
        printCommand = `mspaint.exe /p ${quotedPath}`;
      }
    } else {
      // macOS/Linux: Convert to PDF and use lp command
      const pdfBase64 = await convertImageToPdf(imageBuffer, paperDims, settings);
      const pdfBuffer = Buffer.from(pdfBase64, 'base64');
      tempFilePath = path.join(tempDir, `print-${Date.now()}.pdf`);
      fs.writeFileSync(tempFilePath, pdfBuffer);
      
      if (platform === 'darwin') {
        // macOS: Use lp command
        const printer = printerName ? `-d "${printerName}"` : '';
        printCommand = `lp ${printer} "${tempFilePath}"`;
      } else {
        // Linux: Use lp command (CUPS)
        const printer = printerName ? `-d "${printerName}"` : '';
        printCommand = `lp ${printer} "${tempFilePath}"`;
      }
    }
    
    // Execute print command
    try {
      const { stdout, stderr } = await execAsync(printCommand);
      
      // Clean up temp file after a delay (give printer time to read it)
      setTimeout(() => {
        try {
          if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
          }
        } catch (cleanupError) {
          console.warn('Failed to cleanup temp file:', cleanupError);
    }
      }, 5000);

    return NextResponse.json({
      success: true,
      message: 'Print job submitted successfully',
        printer: printerName || 'default printer',
        output: stdout,
        note: platform === 'win32' ? 'Note: Printer settings (paper size, borderless, quality, etc.) are controlled by your printer\'s default preferences. Set them in Windows Printer Properties if needed.' : undefined,
      });
    } catch (execError: any) {
      // Clean up temp file on error
      try {
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
      } catch (cleanupError) {
        console.warn('Failed to cleanup temp file:', cleanupError);
      }
      
      throw new Error(`Print command failed: ${execError.message || execError.stderr || 'Unknown error'}`);
    }
  } catch (error: any) {
    console.error('Local printing error:', error);
    return NextResponse.json(
      { 
        error: 'Local printing failed', 
        details: error.message,
        platform: os.platform(),
        note: 'Make sure your printer is installed and accessible. On Windows, ensure the printer name matches exactly as it appears in your printer settings.'
      },
      { status: 500 }
    );
  }
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

// Convert image buffer to PDF
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

