import cv2
import numpy as np
import requests
from io import BytesIO
from PIL import Image

# Download Satellite Image from Google Maps
def get_satellite_image(lat, lon, api_key, zoom=20, size="640x640"):
    """
    Downloads a satellite image for a given lat/lon.
    """
    url = (
        f"https://maps.googleapis.com/maps/api/staticmap?"
        f"center={lat},{lon}&zoom={zoom}&size={size}&maptype=satellite&key={api_key}"
    )

    response = requests.get(url)

    if response.status_code != 200:
        return None, "Failed to download satellite image."

    img = Image.open(BytesIO(response.content)).convert("RGB")
    return img, None


# Simple Roof Segmentation Using OpenCV
def segment_roof(img_pil):
    """
    Detects roof region using color + edge detection.
    Works best for red, brown, blue, and metal roofs.
    """

    img = np.array(img_pil)
    hsv = cv2.cvtColor(img, cv2.COLOR_RGB2HSV)

    # Range for typical roof colors
    lower = np.array([0, 20, 20])
    upper = np.array([180, 255, 255])

    mask = cv2.inRange(hsv, lower, upper)

    # Clean noise
    kernel = np.ones((5, 5), np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)

    # Extract largest connected component → roof
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    if not contours:
        return None, "No roof detected."

    # Largest detected area
    largest = max(contours, key=cv2.contourArea)

    roof_mask = np.zeros_like(mask)
    cv2.drawContours(roof_mask, [largest], -1, 255, -1)

    return roof_mask, None


# 3. Estimate Roof Area (approx m²)
def calculate_roof_area(mask, zoom=20):
    """
    Approximates roof area based on pixel count and Google Maps scale.
    """

    pixel_count = np.sum(mask == 255)

    # At zoom level 20: approx 0.1 meter per pixel
    meters_per_pixel = 0.1

    area = pixel_count * (meters_per_pixel ** 2)
    return round(area, 2)


# Detect Orientation Angle of the Roof
def calculate_orientation(mask):
    """
    Finds direction of the roof using PCA (principal axis).
    """

    ys, xs = np.where(mask == 255)
    points = np.column_stack((xs, ys))

    if len(points) < 50:
        return 0  # Not enough data

    # PCA
    mean = np.mean(points, axis=0)
    centered = points - mean
    cov = np.cov(centered, rowvar=False)
    eigvals, eigvecs = np.linalg.eig(cov)

    # Main axis
    principal_axis = eigvecs[:, np.argmax(eigvals)]

    # Convert to angle
    angle = np.degrees(np.arctan2(principal_axis[1], principal_axis[0]))
    angle = (angle + 360) % 360  # Normalize

    return round(angle, 2)


# Roof Type (flat / Tilted)
def detect_roof_tilt(img_pil):
    """
    Simple heuristic:
    - Flat roofs = high shadow uniformity
    - Tilted roofs = strong directional shadows
    """

    img = np.array(img_pil)
    gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)

    # Sobel edge magnitude
    sobel = cv2.Sobel(gray, cv2.CV_64F, 1, 1, ksize=5)
    edge_strength = np.mean(np.abs(sobel))

    if edge_strength < 20:
        return "Flat Roof"
    else:
        return "Tilted Roof"
