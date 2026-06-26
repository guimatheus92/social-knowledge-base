import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { DOWNLOADS } from "@/server/paths";

export const runtime = "nodejs";

/**
 * Opens the NATIVE Windows folder picker (FolderBrowserDialog via PowerShell)
 * and returns the chosen path. This works because the app is local: the dialog
 * shows up in the user's session. Uses an off-screen TopMost owner to bring the
 * dialog to the FRONT (otherwise it opens behind the browser and the button
 * "spins" forever).
 */
export async function POST(req: Request): Promise<Response> {
  if (process.platform !== "win32") {
    return Response.json({ error: "Native picker only on Windows" }, { status: 501 });
  }
  let current = DOWNLOADS;
  try {
    const body = await req.json();
    if (body?.current && existsSync(body.current)) current = body.current;
  } catch {
    /* no body */
  }
  const init = current.replace(/'/g, "''");
  const script = [
    "Add-Type -AssemblyName System.Windows.Forms;",
    "Add-Type -AssemblyName System.Drawing;",
    "$o = New-Object System.Windows.Forms.Form;",
    "$o.StartPosition = 'Manual';",
    "$o.Location = New-Object System.Drawing.Point(-3000, -3000);",
    "$o.Size = New-Object System.Drawing.Size(1, 1);",
    "$o.TopMost = $true; $o.ShowInTaskbar = $false;",
    "$o.Show(); $o.Activate();",
    "$d = New-Object System.Windows.Forms.FolderBrowserDialog;",
    "$d.Description = 'Choose the download folder';",
    "$d.ShowNewFolderButton = $true;",
    `if (Test-Path -LiteralPath '${init}') { $d.SelectedPath = '${init}' };`,
    "$r = $d.ShowDialog($o);",
    "$o.Close();",
    "if ($r -eq [System.Windows.Forms.DialogResult]::OK) { [Console]::Out.Write($d.SelectedPath) }",
  ].join(" ");

  const path = await new Promise<string>((resolve) => {
    const p = spawn("powershell.exe", ["-NoProfile", "-STA", "-Command", script], {
      windowsHide: true,
    });
    let out = "";
    const timer = setTimeout(() => {
      try {
        p.kill();
      } catch {
        /* ignore */
      }
      resolve("");
    }, 180000);
    p.stdout.on("data", (d) => {
      out += d.toString();
    });
    p.on("close", () => {
      clearTimeout(timer);
      resolve(out.trim());
    });
    p.on("error", () => {
      clearTimeout(timer);
      resolve("");
    });
  });

  return Response.json({ path: path || null, cancelled: !path });
}
