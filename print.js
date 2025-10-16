/**
README – Continuous sticker printing for TSC TTP-244 Plus
=========================================================
- Installation: `npm i serialport csv-parse dotenv`
- Example .env:
    SERIAL_PORT=/dev/ttyUSB0
    BAUD_RATE=115200
    GAP_MM=3
    SPEED=4
    DENSITY=10
    H_SHIFT_DOTS=0
    V_SHIFT_DOTS=0
    FONT_SCALE_X=1
    FONT_SCALE_Y=1
    BARCODE_HEIGHT=80
    ENABLE_ALIGNMENT_BOX=0
- Example data.csv:
    name,id,barcode
    คอมพิวเตอร์ห้องประชุม,EQ-001,8850107600012
- Example data.json:
    [
      {"name": "เครื่องพิมพ์สำรอง", "id": "EQ-PRN-01", "barcode": "8850107600029"}
    ]
- Run commands:
    node print.js --file=data.csv
    node print.js --file=data.json
    node print.js --test

หมายเหตุภาษาไทย: ฟอนต์พื้นฐาน TSPL ของ TTP-244 Plus ไม่รองรับการแสดงผลภาษาไทยโดยตรง
(จะเห็นเป็นสี่เหลี่ยม/??). ถ้าจำเป็นต้องแสดงภาษาไทยให้เรนเดอร์ข้อความเป็นภาพ
โมโนโครม BMP แล้วส่งด้วยคำสั่ง `PUTBMP`.
*/

import dotenv from "dotenv";
import fs from "node:fs/promises";
import path from "node:path";
import { once } from "node:events";
import process from "node:process";
import { SerialPort } from "serialport";
import { parse as parseCsv } from "csv-parse/sync";

dotenv.config();

const WIDTH_DOTS = Math.round((70 / 25.4) * 203); // ≈ 559
const HEIGHT_DOTS = Math.round((25 / 25.4) * 203); // ≈ 200

function getEnvConfig() {
  const {
    SERIAL_PORT = "/dev/ttyUSB0",
    BAUD_RATE = "115200",
    GAP_MM = "3",
    SPEED = "4",
    DENSITY = "10",
    H_SHIFT_DOTS = "0",
    V_SHIFT_DOTS = "0",
    FONT_SCALE_X = "1",
    FONT_SCALE_Y = "1",
    BARCODE_HEIGHT = "80",
    ENABLE_ALIGNMENT_BOX = "0",
  } = process.env;

  return {
    portPath: SERIAL_PORT,
    baudRate: Number.parseInt(BAUD_RATE, 10) || 115200,
    gapMm: Number.parseFloat(GAP_MM) || 3,
    speed: Number.parseInt(SPEED, 10) || 4,
    density: Number.parseInt(DENSITY, 10) || 10,
    hShift: Number.parseInt(H_SHIFT_DOTS, 10) || 0,
    vShift: Number.parseInt(V_SHIFT_DOTS, 10) || 0,
    fontScaleX: Number.parseInt(FONT_SCALE_X, 10) || 1,
    fontScaleY: Number.parseInt(FONT_SCALE_Y, 10) || 1,
    barcodeHeight: Number.parseInt(BARCODE_HEIGHT, 10) || 80,
    enableAlignmentBox: ENABLE_ALIGNMENT_BOX !== "0",
  };
}

function parseArgs(argv) {
  const args = {
    file: null,
    test: false,
  };

  for (const arg of argv.slice(2)) {
    if (arg.startsWith("--file=")) {
      args.file = arg.slice("--file=".length).trim();
    } else if (arg === "--test") {
      args.test = true;
    }
  }

  return args;
}

export function buildTSPL(record, env) {
  const safeText = (value) => {
    if (value == null) return "";
    return String(value).replace(/"/g, "'");
  };

  const text = safeText(record.name || record.id || "UNKNOWN");
  const barcode = safeText(record.barcode || record.id || "000000000000");

  const lines = [
    `SIZE 70 mm,25 mm`,
    `GAP ${env.gapMm} mm,0 mm`,
    `DIRECTION 1`,
    `REFERENCE 0,0`,
    `SPEED ${env.speed}`,
    `DENSITY ${env.density}`,
    `SET TEAR ON`,
    `CLS`,
  ];

  if (env.enableAlignmentBox) {
    lines.push(`BOX 5,5,${WIDTH_DOTS - 5},${HEIGHT_DOTS - 5},2`);
  }

  lines.push(
    `TEXT ${20 + env.hShift},${30 + env.vShift},"0",0,${env.fontScaleX},${env.fontScaleY},"${text}"`,
    `BARCODE ${40 + env.hShift},${90 + env.vShift},"128",${env.barcodeHeight},1,0,2,2,"${barcode}"`,
    `PRINT 1,1`
  );

  return lines.join("\n");
}

async function readCsv(filePath) {
  const content = await fs.readFile(filePath, "utf-8");
  const records = parseCsv(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
  return records;
}

async function readJson(filePath) {
  const content = await fs.readFile(filePath, "utf-8");
  const data = JSON.parse(content);

  if (!Array.isArray(data)) {
    throw new Error("JSON file must contain an array of objects.");
  }

  return data;
}

export async function printFile(inputPath, env, port) {
  const absolutePath = path.resolve(process.cwd(), inputPath);
  const ext = path.extname(absolutePath).toLowerCase();
  let records;

  if (ext === ".csv") {
    records = await readCsv(absolutePath);
  } else if (ext === ".json") {
    records = await readJson(absolutePath);
  } else {
    throw new Error(`Unsupported file format "${ext}". Use CSV or JSON.`);
  }

  if (!records.length) {
    console.warn("No records found in input file.");
    return;
  }

  for (const [index, record] of records.entries()) {
    try {
      const tspl = buildTSPL(record, env);
      await sendToPrinter(port, tspl);
      console.log(`Printed label ${index + 1}/${records.length}`);
    } catch (error) {
      console.error(`Failed to print record at index ${index}:`, error);
    }
  }
}

async function sendToPrinter(port, command) {
  const payload = `${command.replace(/\r?\n/g, "\r\n")}\r\n`;

  await new Promise((resolve, reject) => {
    port.write(payload, "utf-8", (writeError) => {
      if (writeError) {
        reject(writeError);
        return;
      }
      port.drain((drainError) => {
        if (drainError) {
          reject(drainError);
        } else {
          resolve();
        }
      });
    });
  });
}

export async function renderTextToBmp(_text) {
  // TODO: Use node-canvas (CanvasRenderingContext2D) to render Thai text into a monochrome BMP.
  // The resulting file can be referenced with PUTBMP x,y,"thai.bmp".
  // Stubbed for now because full implementation depends on font files and canvas setup.
  throw new Error("renderTextToBmp is not implemented. See TODO in print.js.");
}

async function main() {
  const args = parseArgs(process.argv);
  const env = getEnvConfig();

  if (!args.test && !args.file) {
    console.error("Usage: node print.js --file=path/to/data.csv|json OR node print.js --test");
    process.exitCode = 1;
    return;
  }

  const port = new SerialPort({
    path: env.portPath,
    baudRate: env.baudRate,
    autoOpen: false,
  });

  try {
    port.open();
    await once(port, "open");
    console.log(`Serial port ${env.portPath} opened.`);

    if (args.test) {
      const testRecord = {
        name: "TEST LABEL",
        id: "TEST-001",
        barcode: "123456789012",
      };
      const tspl = buildTSPL(testRecord, env);
      await sendToPrinter(port, tspl);
      console.log("Test label sent.");
      return;
    }

    await printFile(args.file, env, port);
  } catch (error) {
    console.error("Printing failed:", error);
    process.exitCode = 1;
  } finally {
    if (port.isOpen) {
      await new Promise((resolve) => {
        port.close(() => resolve());
      });
      console.log("Serial port closed.");
    }
  }
}

main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exitCode = 1;
});
