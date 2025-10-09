export const generateMissionPDF = async (mission: any, expenses: any, agents: any[]) => {
  // Create a printable HTML content
  const content = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Ordre de Mission - ${mission.reference}</title>
      <style>
        @page { size: A4; margin: 20mm; }
        body { 
          font-family: Arial, sans-serif; 
          line-height: 1.6;
          color: #333;
          max-width: 210mm;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          text-align: center;
          border-bottom: 3px solid #333;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          text-transform: uppercase;
        }
        .reference {
          font-size: 14px;
          color: #666;
          margin-top: 10px;
        }
        .section {
          margin-bottom: 25px;
        }
        .section-title {
          font-size: 16px;
          font-weight: bold;
          background: #f0f0f0;
          padding: 8px 12px;
          margin-bottom: 12px;
          border-left: 4px solid #333;
        }
        .info-row {
          display: flex;
          margin-bottom: 8px;
          page-break-inside: avoid;
        }
        .info-label {
          font-weight: bold;
          width: 180px;
          flex-shrink: 0;
        }
        .info-value {
          flex: 1;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 10px;
          text-align: left;
        }
        th {
          background-color: #f0f0f0;
          font-weight: bold;
        }
        .total-row {
          font-weight: bold;
          background-color: #f9f9f9;
        }
        .signatures {
          margin-top: 50px;
          display: flex;
          justify-content: space-between;
        }
        .signature-box {
          width: 45%;
          text-align: center;
        }
        .signature-line {
          border-top: 1px solid #333;
          margin-top: 60px;
          padding-top: 5px;
        }
        .footer {
          margin-top: 40px;
          text-align: center;
          font-size: 12px;
          color: #666;
          border-top: 1px solid #ddd;
          padding-top: 15px;
        }
        @media print {
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Ordre de Mission</h1>
        <div class="reference">Référence: ${mission.reference}</div>
        <div class="reference">Date d'émission: ${new Date().toLocaleDateString('fr-FR')}</div>
      </div>

      <div class="section">
        <div class="section-title">Informations de la Mission</div>
        <div class="info-row">
          <div class="info-label">Titre:</div>
          <div class="info-value">${mission.title}</div>
        </div>
        <div class="info-row">
          <div class="info-label">Destination:</div>
          <div class="info-value">${mission.destination}</div>
        </div>
        <div class="info-row">
          <div class="info-label">Date de début:</div>
          <div class="info-value">${new Date(mission.start_date).toLocaleDateString('fr-FR')}</div>
        </div>
        <div class="info-row">
          <div class="info-label">Date de fin:</div>
          <div class="info-value">${new Date(mission.end_date).toLocaleDateString('fr-FR')}</div>
        </div>
        ${mission.description ? `
        <div class="info-row">
          <div class="info-label">Description:</div>
          <div class="info-value">${mission.description}</div>
        </div>
        ` : ''}
      </div>

      <div class="section">
        <div class="section-title">Agents Participants</div>
        <table>
          <thead>
            <tr>
              <th>Nom Complet</th>
              <th>Département</th>
              <th>Rôle dans la mission</th>
            </tr>
          </thead>
          <tbody>
            ${agents.map((agent, index) => `
              <tr>
                <td>${agent.full_name}</td>
                <td>${agent.department || 'Non spécifié'}</td>
                <td>${index === 0 ? 'Agent principal' : 'Agent participant'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="section">
        <div class="section-title">Détail des Frais</div>
        <table>
          <thead>
            <tr>
              <th>Type de frais</th>
              <th>Quantité</th>
              <th>Prix unitaire</th>
              <th>Total (FCFA)</th>
            </tr>
          </thead>
          <tbody>
            ${expenses.per_diem_days > 0 ? `
            <tr>
              <td>Perdiem</td>
              <td>${expenses.per_diem_days} jours</td>
              <td>${expenses.per_diem_rate.toLocaleString()} FCFA</td>
              <td>${expenses.per_diem_total.toLocaleString()} FCFA</td>
            </tr>
            ` : ''}
            ${expenses.accommodation_days > 0 ? `
            <tr>
              <td>Hébergement</td>
              <td>${expenses.accommodation_days} nuits</td>
              <td>${expenses.accommodation_unit_price.toLocaleString()} FCFA</td>
              <td>${expenses.accommodation_total.toLocaleString()} FCFA</td>
            </tr>
            ` : ''}
            ${expenses.transport_distance > 0 ? `
            <tr>
              <td>Transport (${expenses.transport_type})</td>
              <td>${expenses.transport_distance} km</td>
              <td>${expenses.transport_unit_price.toLocaleString()} FCFA</td>
              <td>${expenses.transport_total.toLocaleString()} FCFA</td>
            </tr>
            ` : ''}
            ${expenses.fuel_quantity > 0 ? `
            <tr>
              <td>Carburant</td>
              <td>${expenses.fuel_quantity} litres</td>
              <td>${expenses.fuel_unit_price.toLocaleString()} FCFA</td>
              <td>${expenses.fuel_total.toLocaleString()} FCFA</td>
            </tr>
            ` : ''}
            ${expenses.other_expenses > 0 ? `
            <tr>
              <td>Autres frais${expenses.other_expenses_description ? ` (${expenses.other_expenses_description})` : ''}</td>
              <td>-</td>
              <td>-</td>
              <td>${expenses.other_expenses.toLocaleString()} FCFA</td>
            </tr>
            ` : ''}
            <tr class="total-row">
              <td colspan="3">TOTAL ESTIMÉ</td>
              <td>${mission.estimated_amount.toLocaleString()} FCFA</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="signatures">
        <div class="signature-box">
          <div>L'Agent</div>
          <div class="signature-line"></div>
        </div>
        <div class="signature-box">
          <div>Le Chef de Service</div>
          <div class="signature-line"></div>
        </div>
      </div>

      <div class="signatures">
        <div class="signature-box">
          <div>Le Directeur</div>
          <div class="signature-line"></div>
        </div>
        <div class="signature-box">
          <div>Le Service Financier</div>
          <div class="signature-line"></div>
        </div>
      </div>

      <div class="footer">
        Document généré automatiquement le ${new Date().toLocaleString('fr-FR')}
      </div>
    </body>
    </html>
  `;

  // Open print dialog
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.focus();
    
    // Wait for content to load then print
    printWindow.onload = () => {
      printWindow.print();
    };
  }
};
