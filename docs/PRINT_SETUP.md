# Print Setup Guide for Epson L3210

This guide will help you set up direct printing from the web application to your Epson L3210 printer.

## Option 1: PrintNode (Recommended - Cloud Printing Service)

PrintNode is a cloud printing service that allows you to print directly from web applications to any printer, including your Epson L3210.

### Setup Steps:

1. **Sign up for PrintNode**
   - Go to https://www.printnode.com
   - Create a free account (includes 500 prints/month)
   - Sign in to your account

2. **Install PrintNode Client**
   - Download the PrintNode Client from https://www.printnode.com/download
   - Install it on the computer where your Epson L3210 printer is connected
   - Sign in to the PrintNode Client with your account credentials
   - Your Epson L3210 printer should automatically appear in your PrintNode dashboard

3. **Get Your API Key**
   - Go to your PrintNode dashboard: https://app.printnode.com/apikey
   - Click "Create API Key"
   - Copy the API key

4. **Configure the Application**
   - Create or edit `.env.local` file in the root of your project
   - Add the following line:
     ```
     PRINTNODE_API_KEY=your_api_key_here
     ```
   - Replace `your_api_key_here` with your actual PrintNode API key

5. **Restart the Development Server**
   - Stop your current dev server (Ctrl+C)
   - Run `npm run dev` again to load the new environment variable

### Using PrintNode:

- The print button will now automatically send print jobs to your Epson L3210 via PrintNode
- You can configure printer settings in the "Print Settings" dialog
- The printer name should be set to "Epson L3210" or your printer's exact name as it appears in PrintNode

## Option 2: Local Printing (Advanced - Requires System Setup)

For local printing without cloud services, you'll need to set up system-specific printer communication.

### Windows Setup:

1. Ensure your Epson L3210 is installed and accessible
2. Set `ENABLE_LOCAL_PRINTING=true` in `.env.local`
3. This option requires additional implementation based on your Windows version

### Linux/Mac Setup:

1. Ensure CUPS (Common Unix Printing System) is installed
2. Set `ENABLE_LOCAL_PRINTING=true` in `.env.local`
3. Configure printer access permissions

**Note:** Local printing requires additional development work and may not work out of the box.

## Printer Settings Configuration

In the application, you can configure:

- **Paper Size**: 4x6, 5x7, 8x10, or custom
- **Orientation**: Landscape or Portrait
- **DPI**: 150, 300, or 600 (print quality)
- **Scale Mode**: Fit to page, Actual size, or Custom scale
- **Margins**: None, Small, Medium, Large, or Custom
- **Printer Name**: The name of your printer (defaults to "Epson L3210")

## Troubleshooting

### Print jobs not appearing:
- Verify PrintNode Client is running on the computer with your printer
- Check that your printer is online and connected
- Verify the API key is correct in `.env.local`
- Check browser console for error messages

### Printer not found:
- Ensure the printer name matches exactly as it appears in PrintNode
- Try using a partial name (e.g., "L3210" or "Epson")
- Check PrintNode dashboard to see available printers

### API errors:
- Verify your PrintNode account is active
- Check your API key permissions in PrintNode dashboard
- Ensure you haven't exceeded your monthly print limit

## Support

For PrintNode-specific issues, visit:
- PrintNode Documentation: https://www.printnode.com/en/docs
- PrintNode Support: https://www.printnode.com/en/help

For application-specific issues, check the browser console for error messages.

