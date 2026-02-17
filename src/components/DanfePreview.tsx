import React from "react";

interface Props {
  children: React.ReactNode;
}

export default function DanfePreview({ children }: Props) {
  return (
    <>
      <style>{`
        @page {
          size: A4 portrait;
          margin: 10mm;
        }

        html, body {
          height: 100%;
          margin: 0;
          padding: 0;
          background: #e5e7eb;
        }

        .page-container {
          display: flex;
          justify-content: center;
          align-items: flex-start;
          padding: 20px;
        }

        .danfe-page {
          width: 210mm;
          height: 297mm;
          background: white;
          padding: 8mm;
          box-sizing: border-box;

          display: flex;
          flex-direction: column;
        }

        .danfe-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          height: 100%;
        }

        .danfe-section {
          margin-bottom: 2mm;
        }

        .danfe-items {
          flex-grow: 1;
        }

        .danfe-additional {
          flex-grow: 1;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          min-height: 40mm;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 10px;
        }

        td, th {
          padding: 2px;
          vertical-align: top;
        }

        .fill-remaining {
          flex-grow: 1;
        }

        @media print {
          body {
            background: white;
          }

          .page-container {
            padding: 0;
          }

          .danfe-page {
            width: 210mm;
            height: 297mm;
            margin: 0;
            box-shadow: none;
          }
        }
      `}</style>

      <div className="page-container">
        <div className="danfe-page">
          <div className="danfe-content">

            {/* CONTEÚDO PRINCIPAL */}
            <div className="danfe-section danfe-items">
              {children}
            </div>

            {/* ÁREA QUE EXPANDE AUTOMATICAMENTE */}
            <div className="danfe-section danfe-additional fill-remaining" />

          </div>
        </div>
      </div>
    </>
  );
}
