import cv2
import numpy as np


def add_outline_cv2(image_path, output_path, thickness=5, outline_color=(255, 255, 255)):
    """
    Add an outline around the non-transparent parts of a PNG image.

    Args:
        image_path: Path to input PNG image
        output_path: Path to save output PNG image
        thickness: Thickness of the outline in pixels
        outline_color: Color of the outline (B, G, R) - default white
    """
    # Load image with alpha channel
    img = cv2.imread(image_path, cv2.IMREAD_UNCHANGED)

    if img is None:
        raise ValueError(f"Could not load image: {image_path}")

    # Check if image has alpha channel
    if img.shape[2] < 4:
        raise ValueError("Image must have alpha channel (PNG with transparency)")

    # Separate RGB and alpha channels
    bgr = img[:, :, :3]
    alpha = img[:, :, 3]

    # Create mask from alpha channel (non-transparent areas)
    _, mask = cv2.threshold(alpha, 1, 255, cv2.THRESH_BINARY)

    # Create outline by dilating the mask
    kernel = np.ones((3, 3), np.uint8)
    outline_mask = mask.copy()
    for _ in range(thickness):
        outline_mask = cv2.dilate(outline_mask, kernel, iterations=1)

    # Create outline layer (subtract original mask from dilated mask)
    outline = cv2.subtract(outline_mask, mask)

    # Create new BGR image starting with original
    result_bgr = bgr.copy()

    # Apply outline color where outline exists
    result_bgr[outline > 0] = outline_color

    # Create new alpha: original mask + outline = dilated mask
    result_alpha = outline_mask

    # Merge result
    result = cv2.merge([result_bgr, result_alpha])

    # Save result
    cv2.imwrite(output_path, result)
    print(f"Saved outlined image to: {output_path}")


def add_padding_and_outline(image_path, output_path, padding=8, thickness=5, outline_color=(255, 255, 255)):
    """
    Add padding around an image and then add an outline.

    Args:
        image_path: Path to input PNG image
        output_path: Path to save output PNG image
        padding: Padding in pixels to add on each side
        thickness: Thickness of the outline in pixels
        outline_color: Color of the outline (B, G, R) - default white
    """
    # Load image with alpha channel
    img = cv2.imread(image_path, cv2.IMREAD_UNCHANGED)

    if img is None:
        raise ValueError(f"Could not load image: {image_path}")

    # Get original dimensions
    orig_h, orig_w = img.shape[:2]

    # Create new canvas with padding
    new_w = orig_w + (padding * 2)
    new_h = orig_h + (padding * 2)

    # Create transparent canvas (with alpha)
    new_canvas = np.zeros((new_h, new_w, 4), dtype=np.uint8)

    # Place original image in center
    new_canvas[padding:padding+orig_h, padding:padding+orig_w] = img

    # Save temporarily
    temp_path = output_path.replace('.png', '_temp.png')
    cv2.imwrite(temp_path, new_canvas)

    # Add outline to padded image
    add_outline_cv2(temp_path, output_path, thickness, outline_color)

    # Clean up temp file
    import os
    os.remove(temp_path)

    print(f"Saved padded+outlined image to: {output_path}")


if __name__ == "__main__":
    import sys
    if len(sys.argv) >= 3:
        add_padding_and_outline(sys.argv[1], sys.argv[2])
