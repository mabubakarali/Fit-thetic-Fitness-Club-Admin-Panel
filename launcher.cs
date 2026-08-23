using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.IO.Compression;
using System.Net;
using System.Reflection;
using System.Text;
using System.Threading;
using System.Windows.Forms;

namespace FitTheticGymLauncher
{
    static class Program
    {
        private static HttpListener httpListener;
        private static string distDir;
        private static bool isRunning = true;
        private static int serverPort = 4173;
        private static NotifyIcon trayIcon;
        private static Mutex singleInstanceMutex;

        [STAThread]
        static void Main()
        {
            bool createdNew;
            singleInstanceMutex = new Mutex(true, "FitTheticGymSingleInstanceMutex_V2", out createdNew);
            if (!createdNew)
            {
                OpenAppWindow("http://127.0.0.1:4173/");
                return;
            }

            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            string appDir = AppDomain.CurrentDomain.BaseDirectory;
            string localDist = Path.Combine(appDir, "dist");
            string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            string targetExtraction = Path.Combine(localAppData, @"FitTheticGym\AppRuntime");

            if (Directory.Exists(localDist) && File.Exists(Path.Combine(localDist, "index.html")))
            {
                distDir = localDist;
            }
            else
            {
                try
                {
                    Assembly asm = Assembly.GetExecutingAssembly();
                    using (Stream stream = asm.GetManifestResourceStream("dist.zip"))
                    {
                        if (stream != null)
                        {
                            if (Directory.Exists(targetExtraction))
                            {
                                try { Directory.Delete(targetExtraction, true); } catch { }
                            }
                            Directory.CreateDirectory(targetExtraction);

                            string tempZip = Path.Combine(targetExtraction, "update.zip");
                            using (FileStream fs = new FileStream(tempZip, FileMode.Create, FileAccess.Write))
                            {
                                stream.CopyTo(fs);
                            }

                            ZipFile.ExtractToDirectory(tempZip, targetExtraction);
                            try { File.Delete(tempZip); } catch { }
                        }
                    }
                }
                catch { }

                distDir = targetExtraction;
            }

            // Start Rock-solid HttpListener Server
            StartHttpServer();

            string targetUrl = "http://127.0.0.1:" + serverPort + "/";

            // Open Window
            OpenAppWindow(targetUrl);

            // Tray Icon
            trayIcon = new NotifyIcon();
            trayIcon.Text = "Fit-Thetic Fitness Club";

            try
            {
                Assembly asm = Assembly.GetExecutingAssembly();
                using (Stream s = asm.GetManifestResourceStream("app_icon.ico"))
                {
                    if (s != null) trayIcon.Icon = new Icon(s);
                    else trayIcon.Icon = SystemIcons.Application;
                }
            }
            catch
            {
                trayIcon.Icon = SystemIcons.Application;
            }

            ContextMenuStrip contextMenu = new ContextMenuStrip();
            contextMenu.Items.Add("Open Fit-Thetic App", null, (s, e) => OpenAppWindow(targetUrl));
            contextMenu.Items.Add("-");
            contextMenu.Items.Add("Exit Software", null, (s, e) => {
                isRunning = false;
                try { if (httpListener != null) httpListener.Stop(); } catch { }
                trayIcon.Visible = false;
                Application.Exit();
            });

            trayIcon.ContextMenuStrip = contextMenu;
            trayIcon.DoubleClick += (s, e) => OpenAppWindow(targetUrl);
            trayIcon.Visible = true;

            Application.Run();
        }

        private static void StartHttpServer()
        {
            try
            {
                httpListener = new HttpListener();
                httpListener.Prefixes.Add("http://127.0.0.1:" + serverPort + "/");
                httpListener.Start();
                ThreadPool.QueueUserWorkItem(HttpListenLoop);
            }
            catch
            {
                serverPort = 4174;
                try
                {
                    httpListener = new HttpListener();
                    httpListener.Prefixes.Add("http://127.0.0.1:" + serverPort + "/");
                    httpListener.Start();
                    ThreadPool.QueueUserWorkItem(HttpListenLoop);
                }
                catch (Exception ex)
                {
                    MessageBox.Show("Could not start local server: " + ex.Message, "Fit-Thetic Server", MessageBoxButtons.OK, MessageBoxIcon.Error);
                }
            }
        }

        private static void HttpListenLoop(object state)
        {
            while (isRunning && httpListener != null && httpListener.IsListening)
            {
                try
                {
                    HttpListenerContext context = httpListener.GetContext();
                    ThreadPool.QueueUserWorkItem(ProcessHttpRequest, context);
                }
                catch
                {
                    if (!isRunning) break;
                }
            }
        }

        private static void ProcessHttpRequest(object state)
        {
            HttpListenerContext context = (HttpListenerContext)state;
            try
            {
                string rawUrl = context.Request.RawUrl.Split('?')[0].TrimStart('/');
                if (string.IsNullOrEmpty(rawUrl)) rawUrl = "index.html";

                string filePath = Path.Combine(distDir, rawUrl.Replace('/', Path.DirectorySeparatorChar));
                if (!File.Exists(filePath))
                {
                    filePath = Path.Combine(distDir, "index.html");
                }

                if (!File.Exists(filePath))
                {
                    context.Response.StatusCode = 404;
                    context.Response.Close();
                    return;
                }

                byte[] fileBytes = File.ReadAllBytes(filePath);
                string ext = Path.GetExtension(filePath).ToLowerInvariant();
                string mime = "application/octet-stream";
                switch (ext)
                {
                    case ".html": mime = "text/html; charset=utf-8"; break;
                    case ".js": mime = "application/javascript; charset=utf-8"; break;
                    case ".css": mime = "text/css; charset=utf-8"; break;
                    case ".svg": mime = "image/svg+xml"; break;
                    case ".png": mime = "image/png"; break;
                    case ".jpg":
                    case ".jpeg": mime = "image/jpeg"; break;
                    case ".json": mime = "application/json; charset=utf-8"; break;
                    case ".ico": mime = "image/x-icon"; break;
                    case ".woff2": mime = "font/woff2"; break;
                    case ".woff": mime = "font/woff"; break;
                    case ".ttf": mime = "font/ttf"; break;
                }

                context.Response.ContentType = mime;
                context.Response.ContentLength64 = fileBytes.Length;
                context.Response.AddHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
                context.Response.AddHeader("Pragma", "no-cache");
                context.Response.AddHeader("Access-Control-Allow-Origin", "*");
                context.Response.StatusCode = 200;

                using (Stream output = context.Response.OutputStream)
                {
                    output.Write(fileBytes, 0, fileBytes.Length);
                }
            }
            catch
            {
            }
            finally
            {
                try { context.Response.Close(); } catch { }
            }
        }

        private static void OpenAppWindow(string url)
        {
            try
            {
                string edge64 = @"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe";
                string edge = @"C:\Program Files\Microsoft\Edge\Application\msedge.exe";
                string chrome = @"C:\Program Files\Google\Chrome\Application\chrome.exe";
                string chromeUser = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Google\Chrome\Application\chrome.exe");

                string browserExe = null;
                if (File.Exists(edge64)) browserExe = edge64;
                else if (File.Exists(edge)) browserExe = edge;
                else if (File.Exists(chrome)) browserExe = chrome;
                else if (File.Exists(chromeUser)) browserExe = chromeUser;

                if (!string.IsNullOrEmpty(browserExe))
                {
                    ProcessStartInfo psi = new ProcessStartInfo
                    {
                        FileName = browserExe,
                        Arguments = "--app=\"" + url + "\" --start-maximized --disable-http-cache",
                        WindowStyle = ProcessWindowStyle.Maximized,
                        UseShellExecute = true
                    };
                    Process.Start(psi);
                }
                else
                {
                    Process.Start(url);
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("Could not open browser window: " + ex.Message, "Fit-Thetic", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
        }
    }
}
