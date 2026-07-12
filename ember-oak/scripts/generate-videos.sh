#!/usr/bin/env bash
# ============================================================
# EMBER & OAK — generate the three site clips with
# Seedance 2.0 (ByteDance) on fal.ai, then re-encode them
# scrub-friendly and drop them into assets/video/.
#
# Usage:
#   export FAL_KEY="<your fal.ai key>"     # never commit this
#   ./scripts/generate-videos.sh
#
# Requires: curl, jq. ffmpeg is optional but strongly
# recommended (short-GOP re-encode makes the hero scroll-scrub
# buttery; without it the raw fal output is used as-is).
# ============================================================
set -euo pipefail

: "${FAL_KEY:?Set FAL_KEY to your fal.ai API key (id:secret)}"

MODEL="bytedance/seedance-2.0/text-to-video"
QUEUE="https://queue.fal.run/${MODEL}"
OUT_DIR="$(cd "$(dirname "$0")/.." && pwd)/assets/video"
mkdir -p "$OUT_DIR"

declare -A PROMPTS=(
  [hero]="Extreme slow-motion macro shot of a thick ribeye steak searing over open wood flame, glowing embers rising into pure darkness, cinematic amber light, shallow depth of field, fat caramelizing and glistening, sparks drifting upward, moody high-contrast film look"
  [room]="Slow cinematic dolly shot moving through a moody upscale steakhouse dining room at golden hour, deep brown leather booths, flickering candlelight on dark wood tables, a bartender stirring a cocktail softly blurred in the background, warm amber window light, cinematic film grain, elegant and quiet atmosphere"
  [craft]="Overhead top-down shot of a chef's hands carefully plating a refined dish on dark slate, thin steam curling upward through a beam of warm light, tweezers placing a garnish, dark moody kitchen, cinematic lighting, slow deliberate movement, fine-dining precision"
)

submit() { # $1 = prompt; echoes request payload JSON
  # std tier at 1080p; if the account/model rejects 1080p, retry at 720p
  local prompt="$1" res
  for res in 1080p 720p; do
    local body http
    body=$(curl -sS -w '\n%{http_code}' -X POST "$QUEUE" \
      -H "Authorization: Key ${FAL_KEY}" \
      -H "Content-Type: application/json" \
      -d "$(jq -n --arg p "$prompt" --arg r "$res" \
            '{prompt:$p, resolution:$r, duration:"8", aspect_ratio:"16:9", generate_audio:false}')")
    http="${body##*$'\n'}"
    body="${body%$'\n'*}"
    if [[ "$http" == 2* ]]; then echo "$body"; return 0; fi
    echo "  submit at ${res} failed (HTTP ${http}): ${body}" >&2
  done
  return 1
}

echo "Submitting ${#PROMPTS[@]} Seedance 2.0 jobs…"
declare -A STATUS_URLS RESPONSE_URLS
for name in hero room craft; do
  resp=$(submit "${PROMPTS[$name]}")
  STATUS_URLS[$name]=$(jq -r '.status_url' <<<"$resp")
  RESPONSE_URLS[$name]=$(jq -r '.response_url' <<<"$resp")
  echo "  ${name}: $(jq -r '.request_id' <<<"$resp")"
done

echo "Waiting for renders (typically 1–3 min each)…"
for name in hero room craft; do
  while :; do
    st=$(curl -sS -H "Authorization: Key ${FAL_KEY}" "${STATUS_URLS[$name]}" | jq -r '.status')
    case "$st" in
      COMPLETED) break ;;
      FAILED|ERROR) echo "  ${name}: generation FAILED" >&2; exit 1 ;;
      *) sleep 6 ;;
    esac
  done
  url=$(curl -sS -H "Authorization: Key ${FAL_KEY}" "${RESPONSE_URLS[$name]}" | jq -r '.video.url')
  echo "  ${name}: done → ${url}"
  curl -sS -L -o "${OUT_DIR}/${name}.raw.mp4" "$url"

  if command -v ffmpeg >/dev/null 2>&1; then
    # Short GOP + faststart so the scroll-scrubbed hero seeks frame-accurately.
    ffmpeg -y -loglevel error -i "${OUT_DIR}/${name}.raw.mp4" \
      -c:v libx264 -preset slow -crf 20 -g 4 -keyint_min 2 \
      -pix_fmt yuv420p -movflags +faststart -an "${OUT_DIR}/${name}.mp4"
    # WebM twin for browsers without H.264 (the site lists both sources).
    ffmpeg -y -loglevel error -i "${OUT_DIR}/${name}.raw.mp4" \
      -c:v libvpx-vp9 -crf 33 -b:v 0 -g 4 -row-mt 1 -deadline good \
      -pix_fmt yuv420p -an "${OUT_DIR}/${name}.webm" || true
    rm "${OUT_DIR}/${name}.raw.mp4"
  else
    mv "${OUT_DIR}/${name}.raw.mp4" "${OUT_DIR}/${name}.mp4"
    echo "  (ffmpeg not found — kept raw encode; hero scrubbing may be less smooth)"
  fi

  # refresh the poster frame to match the new clip
  if command -v ffmpeg >/dev/null 2>&1; then
    ffmpeg -y -loglevel error -i "${OUT_DIR}/${name}.mp4" -vframes 1 -q:v 3 \
      "${OUT_DIR}/../poster/${name}.jpg"
  fi
done

echo "All three clips are in ${OUT_DIR}. Reload the site — nothing else to change."
