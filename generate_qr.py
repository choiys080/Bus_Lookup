#!/usr/bin/env python3
import qrcode
import os

# URL for the production site
url = "https://bbraun-itinerary-v2.pages.dev"

# Create QR code
qr = qrcode.QRCode(
    version=1,
    error_correction=qrcode.constants.ERROR_CORRECT_L,
    box_size=10,
    border=4,
)
qr.add_data(url)
qr.make(fit=True)

# Generate image
img = qr.make_image(fill_color="black", back_color="white")

# Save the QR code, overwriting the existing activity_portal_qr.png
img.save("activity_portal_qr.png")

print(f"QR code generated for {url} and saved as activity_portal_qr.png")
