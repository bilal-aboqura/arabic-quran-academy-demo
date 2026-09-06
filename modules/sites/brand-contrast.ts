const luminance = (rgb: number[]) => rgb.map(channel => {
  const value = channel / 255;
  return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
}).reduce((sum, value, i) => sum + value * [.2126, .7152, .0722][i], 0);

/** Keep the selected hue, adjusting brightness for readable controls and links. */
export function readableBrandColor(hex: string, dark = false): string {
  const valid = /^#[0-9a-f]{6}$/i.test(hex) ? hex : '#2563eb';
  let rgb = [1, 3, 5].map(index => parseInt(valid.slice(index, index + 2), 16));
  const background = dark ? luminance([27, 43, 62]) : luminance([241, 245, 246]);
  for (let step = 0; step < 100; step++) {
    const foreground = luminance(rgb);
    const ratio = (Math.max(foreground, background) + .05) / (Math.min(foreground, background) + .05);
    if (ratio >= 5) break;
    rgb = rgb.map(channel => dark ? Math.min(255, channel + 4) : Math.max(0, channel - 4));
  }
  return '#' + rgb.map(channel => channel.toString(16).padStart(2, '0')).join('');
}
