import QRCode from "qrcode";

export const RECEIPT_LINK = "https://smfworks.com";

export async function makeQrDataUrl(text: string = RECEIPT_LINK): Promise<string> {
  return QRCode.toDataURL(text, {
    margin: 1,
    width: 160,
    errorCorrectionLevel: "M",
    color: {
      dark: "#0A0F1F",
      light: "#D7F7FF",
    },
  });
}
