import argparse
import json
import shutil
from pathlib import Path

import cv2
import numpy as np

from validate_dbr_template import decode as dbr_decode
from validate_dbr_template import resolve_template_name


SCRIPT_DIR = Path(__file__).resolve().parent
WORKSPACE_ROOT = SCRIPT_DIR.parent.parent


def parse_args():
    parser = argparse.ArgumentParser(
        description=(
            "Preprocess a fluorescent postal barcode image with color isolation and adaptive "
            "enhancement, then validate candidates with a DBR template."
        )
    )
    parser.add_argument("image", help="Path to source image")
    parser.add_argument(
        "--template-file",
        help=(
            "Template JSON to pair with preprocessing. Defaults to fluorescent-postal-focused-template.json "
            "in the current working directory, then workspace root."
        ),
    )
    parser.add_argument(
        "--template-name",
        help="Template name inside JSON. Defaults to first CaptureVisionTemplates entry.",
    )
    parser.add_argument(
        "--output-dir",
        help="Directory for candidate and decode-ready images. Defaults to <image-stem>_fluorescent_pipeline.",
    )
    parser.add_argument(
        "--decode-ready-name",
        default="decode_ready.png",
        help="Filename for the selected decode-ready image. Default: decode_ready.png",
    )
    parser.add_argument(
        "--fallback-profile",
        choices=["none", "context-retry"],
        default="none",
        help="Fallback profile passed to DBR validator for each candidate. Default: none",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Print full JSON report instead of concise text.",
    )
    return parser.parse_args()


def resolve_template_file(image_path, template_file_arg):
    if template_file_arg:
        candidate = Path(template_file_arg).resolve()
        if candidate.exists():
            return candidate
        raise SystemExit(f"Template not found: {candidate}")

    lookup = [
        Path.cwd() / "fluorescent-postal-focused-template.json",
        image_path.parent / "fluorescent-postal-focused-template.json",
        WORKSPACE_ROOT / "fluorescent-postal-focused-template.json",
    ]
    for candidate in lookup:
        candidate = candidate.resolve()
        if candidate.exists():
            return candidate

    raise SystemExit(
        "No template file provided and fluorescent-postal-focused-template.json was not found. "
        "Use --template-file to specify one."
    )


def normalize_u8(channel):
    return cv2.normalize(channel, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)


def fluorescence_mask(color_image):
    hsv = cv2.cvtColor(color_image, cv2.COLOR_BGR2HSV)
    h, s, v = cv2.split(hsv)

    # Soft and strict masks together handle both very pale and more saturated fluorescent strokes.
    soft = cv2.inRange(hsv, np.array([8, 6, 165], dtype=np.uint8), np.array([45, 120, 255], dtype=np.uint8))
    strict = cv2.inRange(hsv, np.array([8, 18, 110], dtype=np.uint8), np.array([45, 255, 255], dtype=np.uint8))
    mask = cv2.bitwise_or(soft, strict)

    height = color_image.shape[0]
    mask[: int(height * 0.56), :] = 0

    mask = cv2.medianBlur(mask, 5)
    kernel = np.ones((3, 3), dtype=np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=2)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel, iterations=1)

    return mask, h, s, v


def weighted_gray_from_channels(h, s, v, lab_b):
    # Emphasize saturation and Lab-b (yellow/blue axis) for fluorescent orange bars.
    h_f = h.astype(np.float32)
    s_f = s.astype(np.float32)
    v_f = v.astype(np.float32)
    b_f = lab_b.astype(np.float32)

    fused = 0.15 * h_f + 0.45 * s_f + 0.15 * v_f + 0.25 * b_f
    return normalize_u8(fused)


def adaptive_stack(gray):
    clahe = cv2.createCLAHE(clipLimit=4.0, tileGridSize=(8, 8)).apply(gray)
    denoise = cv2.fastNlMeansDenoising(clahe, None, 10, 7, 21)
    blur = cv2.GaussianBlur(denoise, (3, 3), 0)
    sharpen = cv2.addWeighted(denoise, 1.7, blur, -0.7, 0)

    otsu = cv2.threshold(sharpen, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]
    otsu_inv = cv2.bitwise_not(otsu)

    adaptive = cv2.adaptiveThreshold(
        sharpen,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        31,
        2,
    )
    adaptive_inv = cv2.bitwise_not(adaptive)

    adaptive_wide = cv2.adaptiveThreshold(
        sharpen,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        41,
        4,
    )
    adaptive_wide_inv = cv2.bitwise_not(adaptive_wide)

    morph_open = cv2.morphologyEx(otsu, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8), iterations=1)

    return {
        "clahe": clahe,
        "denoise": denoise,
        "sharpen": sharpen,
        "otsu": otsu,
        "otsu_inverted": otsu_inv,
        "adaptive": adaptive,
        "adaptive_inverted": adaptive_inv,
        "adaptive_wide": adaptive_wide,
        "adaptive_wide_inverted": adaptive_wide_inv,
        "otsu_morph_open": morph_open,
    }


def build_variants(color_image):
    variants = {}

    mask, h, s, v = fluorescence_mask(color_image)
    lab = cv2.cvtColor(color_image, cv2.COLOR_BGR2LAB)
    _, _, lab_b = cv2.split(lab)

    mask_bgr = cv2.cvtColor(mask, cv2.COLOR_GRAY2BGR)
    white_bg = np.full_like(color_image, 255)
    masked_color = cv2.bitwise_and(color_image, color_image, mask=mask)
    isolated = np.where(mask_bgr > 0, masked_color, white_bg)

    sat_norm = normalize_u8(s)
    val_norm = normalize_u8(v)
    lab_b_norm = normalize_u8(lab_b)
    fused = weighted_gray_from_channels(h, s, v, lab_b)

    masked_sat = cv2.bitwise_and(sat_norm, sat_norm, mask=mask)
    masked_lab_b = cv2.bitwise_and(lab_b_norm, lab_b_norm, mask=mask)
    masked_fused = cv2.bitwise_and(fused, fused, mask=mask)

    variants["00_mask"] = mask
    variants["01_isolated_color"] = isolated
    variants["02_sat_norm"] = sat_norm
    variants["03_lab_b_norm"] = lab_b_norm
    variants["04_val_norm"] = val_norm
    variants["05_masked_sat"] = masked_sat
    variants["06_masked_lab_b"] = masked_lab_b
    variants["07_masked_fused"] = masked_fused

    for name, image in adaptive_stack(masked_fused).items():
        variants[f"20_{name}"] = image

    # A high-resolution branch often helps very thin bars.
    up4 = cv2.resize(masked_fused, None, fx=4, fy=4, interpolation=cv2.INTER_CUBIC)
    for name, image in adaptive_stack(up4).items():
        variants[f"40_up4_{name}"] = image

    return variants


def save_variants(output_dir, variants):
    output_dir.mkdir(parents=True, exist_ok=True)
    saved = {}
    for name, image in variants.items():
        path = output_dir / f"{name}.png"
        cv2.imwrite(str(path), image)
        saved[name] = path
    return saved


def barcode_likelihood_score(image):
    if image.ndim == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image

    h, _ = gray.shape
    band = gray[int(h * 0.62) : int(h * 0.96), :]
    if band.size == 0:
        band = gray

    sobel_x = cv2.Sobel(band, cv2.CV_32F, 1, 0, ksize=3)
    edge_score = float(np.mean(np.abs(sobel_x)))
    contrast = float(np.std(band))
    return edge_score + 0.35 * contrast


def evaluate_candidates(saved_variants, template_file, template_name, fallback_profile):
    evaluations = []
    for name, path in saved_variants.items():
        items, attempt = dbr_decode(
            path,
            template_file=template_file,
            template_name=template_name,
            fallback_profile=fallback_profile,
        )
        source = cv2.imread(str(path), cv2.IMREAD_UNCHANGED)
        score = barcode_likelihood_score(source)
        evaluations.append(
            {
                "variant": name,
                "image": str(path),
                "attempt": attempt,
                "hit_count": len(items),
                "items": items,
                "likelihood_score": round(score, 4),
            }
        )

    evaluations.sort(
        key=lambda item: (
            item["hit_count"],
            item["likelihood_score"],
        ),
        reverse=True,
    )
    return evaluations


def choose_decode_ready(evaluations):
    if not evaluations:
        return None
    return evaluations[0]


def main():
    args = parse_args()
    image_path = Path(args.image).resolve()
    if not image_path.exists():
        raise SystemExit(f"Image not found: {image_path}")

    template_file = resolve_template_file(image_path, args.template_file)
    template_name = resolve_template_name(template_file, args.template_name)

    output_dir = (
        Path(args.output_dir).resolve()
        if args.output_dir
        else (Path.cwd() / f"{image_path.stem}_fluorescent_pipeline").resolve()
    )
    variants_dir = output_dir / "variants"

    source = cv2.imread(str(image_path), cv2.IMREAD_COLOR)
    if source is None:
        raise SystemExit(f"Failed to load image with OpenCV: {image_path}")

    variants = build_variants(source)
    saved_variants = save_variants(variants_dir, variants)
    evaluations = evaluate_candidates(saved_variants, template_file, template_name, args.fallback_profile)
    best = choose_decode_ready(evaluations)

    decode_ready_path = None
    if best:
        decode_ready_path = (output_dir / args.decode_ready_name).resolve()
        shutil.copyfile(best["image"], decode_ready_path)

    report = {
        "image": str(image_path),
        "template_file": str(template_file),
        "template_name": template_name,
        "fallback_profile": args.fallback_profile,
        "output_dir": str(output_dir),
        "variants_dir": str(variants_dir),
        "decode_ready_image": str(decode_ready_path) if decode_ready_path else None,
        "best_variant": best,
        "evaluations": evaluations,
        "validate_command": (
            f'python tools/validate_dbr_template.py "{decode_ready_path}" '
            f'--template-file "{template_file}" --template-name "{template_name}" --json'
            if decode_ready_path
            else None
        ),
    }

    report_path = output_dir / "pipeline_report.json"
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")

    if args.json:
        print(json.dumps(report, indent=2))
        return

    print(f"image: {image_path}")
    print(f"template_file: {template_file}")
    print(f"template_name: {template_name}")
    print(f"report_json: {report_path}")
    print(f"variants_dir: {variants_dir}")
    if not best:
        print("NO_VARIANTS")
        return

    print(f"decode_ready_image: {decode_ready_path}")
    print(f"best_variant: {best['variant']}")
    print(f"best_hit_count: {best['hit_count']}")
    print(f"best_likelihood_score: {best['likelihood_score']}")
    if best["items"]:
        print("best_items:")
        for index, item in enumerate(best["items"], start=1):
            print(f"  [{index}] {item['format']} :: {item['text']}")
    else:
        print("best_items: NO_RESULT")
    print(f"validate_command: {report['validate_command']}")


if __name__ == "__main__":
    main()