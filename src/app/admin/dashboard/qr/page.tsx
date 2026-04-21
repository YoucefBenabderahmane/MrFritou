"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { QrCode, Printer, Download, RefreshCcw, Trash2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useOrderStore } from "@/lib/store";
import { t } from "@/lib/i18n";

export default function QrCodesPage() {
  const { language } = useOrderStore();
  const [tablesCount, setTablesCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [baseUrl, setBaseUrl] = useState("");

  useEffect(() => {
    setBaseUrl(window.location.origin);
    
    const fetchSettings = async () => {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          setTablesCount(data.tablesCount || 15);
        }
      } catch (error) {
        console.error("Failed to fetch settings:", error);
        setTablesCount(15); // fallback
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const tables = Array.from({ length: tablesCount }, (_, i) => ({
    id: `T-${(i + 1).toString().padStart(2, '0')}`,
    label: `${t("qr.table", language)} ${i + 1}`
  }));

  const handlePrintAll = () => {
    window.print();
  };

  const handleDownloadSingle = (tableId: string, label: string) => {
    const svg = document.getElementById(`qr-${tableId}`);
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      if (ctx) {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        const pngFile = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.download = `QR-${label.replace(/\s+/g, '-')}.png`;
        downloadLink.href = `${pngFile}`;
        downloadLink.click();
      }
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <RefreshCcw className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 w-full print:hidden">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <QrCode className="w-8 h-8 text-primary" />
            {t("qr.title", language)}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("qr.subtitle", language)}
          </p>
        </div>
        <div className="flex gap-2">
          <motion.button
            onClick={handlePrintAll}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl shadow-lg shadow-primary/25"
          >
            <Printer className="w-4 h-4" />
            {t("qr.downloadAll", language)}
          </motion.button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        <AnimatePresence>
          {tables.map((table, index) => (
            <motion.div
              key={table.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.03 }}
              className="bg-card border border-border rounded-2xl p-6 flex flex-col items-center shadow-sm text-center print:break-inside-avoid print:shadow-none print:border-black print:p-8"
            >
              <h3 className="text-xl font-bold text-foreground mb-4">{table.label}</h3>
              
              <div className="bg-white p-3 rounded-xl mb-4 shadow-sm border border-border/50 print:border-none print:shadow-none">
                <QRCodeSVG
                  id={`qr-${table.id}`}
                  value={`${baseUrl}/menu?table=${table.id}`}
                  size={140}
                  bgColor={"#ffffff"}
                  fgColor={"#000000"}
                  level={"H"}
                  includeMargin={false}
                />
              </div>

              <p className="text-xs text-muted-foreground mb-4 break-all px-2 opacity-60 print:hidden">
                {`${baseUrl}/menu?table=${table.id}`}
              </p>

              <div className="flex gap-2 w-full mt-auto print:hidden">
                <button 
                  onClick={() => handleDownloadSingle(table.id, table.label)}
                  className="flex-1 flex items-center justify-center gap-1 py-2 bg-secondary text-foreground hover:bg-secondary/70 rounded-lg text-sm font-medium transition-colors"
                >
                  <Download className="w-4 h-4" /> {t("qr.download", language)}
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .grid, .grid * {
            visibility: visible;
          }
          .grid {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 2rem !important;
          }
          /* Hide the layout sidebar and things */
          aside, header { display: none !important; }
        }
      `}</style>
    </div>
  );
}
