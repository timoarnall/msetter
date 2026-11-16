// Draws the app icon: the top of an M camera seen from above, on the accent yellow.
// Usage: swift mac/icon.swift <out.iconset>
import AppKit

let out = CommandLine.arguments[1]
try? FileManager.default.createDirectory(atPath: out, withIntermediateDirectories: true)

func draw(_ px: Int) -> Data {
    let s = CGFloat(px)
    let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: px, pixelsHigh: px, bitsPerSample: 8, samplesPerPixel: 4,
                               hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
    let inset = s * 0.1, r = s - inset * 2
    NSColor(srgbRed: 0.91, green: 0.725, blue: 0.192, alpha: 1).setFill()
    NSBezierPath(roundedRect: NSRect(x: inset, y: inset, width: r, height: r), xRadius: r * 0.225, yRadius: r * 0.225).fill()
    let ink = NSColor(srgbRed: 0.1, green: 0.1, blue: 0.1, alpha: 1)
    ink.setStroke(); ink.setFill()
    let line = max(1, s * 0.022)
    // body seen from above: a long shape with round ends
    let body = NSBezierPath(roundedRect: NSRect(x: s * 0.2, y: s * 0.38, width: s * 0.6, height: s * 0.2), xRadius: s * 0.1, yRadius: s * 0.1)
    body.lineWidth = line; body.stroke()
    // shutter speed dial and shutter button
    let dial = NSBezierPath(ovalIn: NSRect(x: s * 0.53, y: s * 0.415, width: s * 0.13, height: s * 0.13)); dial.lineWidth = line; dial.stroke()
    NSBezierPath(ovalIn: NSRect(x: s * 0.68, y: s * 0.455, width: s * 0.06, height: s * 0.06)).fill()
    // lens, coming towards you
    let lens = NSBezierPath(roundedRect: NSRect(x: s * 0.33, y: s * 0.26, width: s * 0.16, height: s * 0.13), xRadius: s * 0.02, yRadius: s * 0.02)
    lens.lineWidth = line; lens.stroke()
    NSGraphicsContext.restoreGraphicsState()
    return rep.representation(using: .png, properties: [:])!
}

for (name, px) in [("16x16", 16), ("16x16@2x", 32), ("32x32", 32), ("32x32@2x", 64), ("128x128", 128), ("128x128@2x", 256),
                   ("256x256", 256), ("256x256@2x", 512), ("512x512", 512), ("512x512@2x", 1024)] {
    try! draw(px).write(to: URL(fileURLWithPath: "\(out)/icon_\(name).png"))
}
