import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface PDFExportOptions {
  orientation: 'portrait' | 'landscape';
  format: 'a4' | 'a3';
  scale?: number;
  includeHeader?: boolean;
  headerText?: string;
}

export interface PDFElement {
  id: string;
  label: string;
  selected: boolean;
}

/**
 * Ajoute une capture (canvas) au PDF en la découpant automatiquement sur
 * plusieurs pages lorsqu'elle dépasse la hauteur de page. Sans ce découpage,
 * jsPDF colle l'image d'un seul bloc et tout ce qui dépasse le bas de la page
 * est coupé (c'était la cause des enseignants manquants dans l'export).
 *
 * Renvoie la position Y (en mm) juste après la dernière tranche placée.
 */
function addCanvasPaginated(
  pdf: jsPDF,
  canvas: HTMLCanvasElement,
  opts: { pageWidth: number; pageHeight: number; margin: number; startY: number }
): number {
  const { pageWidth, pageHeight, margin, startY } = opts;
  const printableWidth = pageWidth - 2 * margin;
  const bottomLimit = pageHeight - margin;

  if (canvas.width === 0 || canvas.height === 0) return startY;

  // Conversion pixels du canvas → millimètres (l'image occupe toute la largeur utile)
  const pxToMm = printableWidth / canvas.width;
  const fullHeightMm = canvas.height * pxToMm;

  let placedMm = 0; // hauteur d'image déjà placée (mm)
  let y = startY;

  while (placedMm < fullHeightMm - 0.5) {
    let available = bottomLimit - y; // espace restant sur la page courante
    if (available < 15) {
      pdf.addPage();
      y = margin;
      available = bottomLimit - y;
    }

    const sliceMm = Math.min(fullHeightMm - placedMm, available);
    const sliceHeightPx = Math.max(1, Math.round(sliceMm / pxToMm));
    const sliceTopPx = Math.round(placedMm / pxToMm);

    // Découper la tranche correspondante du canvas source
    const sliceCanvas = document.createElement('canvas');
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = sliceHeightPx;
    const ctx = sliceCanvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
      ctx.drawImage(
        canvas,
        0, sliceTopPx, canvas.width, sliceHeightPx,
        0, 0, canvas.width, sliceHeightPx
      );
    }

    // JPEG (qualité 0.9) : fichier bien plus léger que du PNG pour ce contenu
    const sliceData = sliceCanvas.toDataURL('image/jpeg', 0.9);
    pdf.addImage(sliceData, 'JPEG', margin, y, printableWidth, sliceMm);

    placedMm += sliceMm;
    y += sliceMm;

    if (placedMm < fullHeightMm - 0.5) {
      pdf.addPage();
      y = margin;
    }
  }

  return y;
}

/**
 * Exporte plusieurs éléments sélectionnés en PDF avec options personnalisées
 */
export async function exportMultipleElementsToPDF(
  elements: PDFElement[],
  filename: string,
  options: PDFExportOptions
) {
  try {
    // Filtrer les éléments sélectionnés
    const selectedElements = elements.filter(e => e.selected);
    
    if (selectedElements.length === 0) {
      alert('Veuillez sélectionner au moins un élément à exporter');
      return;
    }

    // Afficher le chargement
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'pdf-loading';
    loadingDiv.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 30px 50px;
      border-radius: 12px;
      z-index: 9999;
      font-size: 20px;
      font-weight: bold;
      text-align: center;
      box-shadow: 0 10px 40px rgba(0,0,0,0.5);
    `;
    loadingDiv.innerHTML = `
      <div style="font-size: 48px; margin-bottom: 10px;">📄</div>
      <div>Génération du PDF...</div>
      <div style="font-size: 14px; margin-top: 10px; opacity: 0.8;">${selectedElements.length} élément(s)</div>
    `;
    document.body.appendChild(loadingDiv);

    // Créer le PDF avec les options
    const pdf = new jsPDF({
      orientation: options.orientation,
      unit: 'mm',
      format: options.format
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    let yPosition = margin;

    // Ajouter l'en-tête si demandé
    if (options.includeHeader && options.headerText) {
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text(options.headerText, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;
      
      // Ligne de séparation
      pdf.setDrawColor(0, 122, 204);
      pdf.setLineWidth(0.5);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 10;
    }

    // Capturer et ajouter chaque élément
    for (let i = 0; i < selectedElements.length; i++) {
      const element = document.getElementById(selectedElements[i].id);
      
      if (!element) {
        console.warn(`Element ${selectedElements[i].id} not found`);
        continue;
      }

      // Mettre à jour le message de chargement
      loadingDiv.innerHTML = `
        <div style="font-size: 48px; margin-bottom: 10px;">📄</div>
        <div>Génération du PDF...</div>
        <div style="font-size: 14px; margin-top: 10px; opacity: 0.8;">Élément ${i + 1}/${selectedElements.length}</div>
      `;

      // Vérifier si c'est une grande section (détail par école)
      const isLargeSection = element.querySelector('.space-y-6') !== null;
      
      if (isLargeSection) {
        // Pour les grandes sections, découper en sous-éléments
        const subElements = element.querySelectorAll('.border-2.border-gray-200.rounded-lg');
        
        if (subElements.length > 0) {
          // Capturer le titre de la section
          const titleElement = element.querySelector('h3');
          if (titleElement) {
            const titleCanvas = await html2canvas(titleElement, {
              scale: options.scale || 2,
              useCORS: true,
              logging: false,
              backgroundColor: '#ffffff'
            });
            
            yPosition = addCanvasPaginated(pdf, titleCanvas, { pageWidth, pageHeight, margin, startY: yPosition });
            yPosition += 5;
          }
          
          // Capturer chaque école individuellement
          for (let j = 0; j < subElements.length; j++) {
            loadingDiv.innerHTML = `
              <div style="font-size: 48px; margin-bottom: 10px;">📄</div>
              <div>Génération du PDF...</div>
              <div style="font-size: 14px; margin-top: 10px; opacity: 0.8;">École ${j + 1}/${subElements.length}</div>
            `;
            
            const subCanvas = await html2canvas(subElements[j] as HTMLElement, {
              scale: options.scale || 2,
              useCORS: true,
              logging: false,
              backgroundColor: '#ffffff'
            });
            
            yPosition = addCanvasPaginated(pdf, subCanvas, { pageWidth, pageHeight, margin, startY: yPosition });
            yPosition += 5;
          }
        }
      } else {
        // Pour les sections normales, capturer normalement
        const canvas = await html2canvas(element, {
          scale: options.scale || 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        });

        // Placer la capture en la découpant sur plusieurs pages si nécessaire
        yPosition = addCanvasPaginated(pdf, canvas, { pageWidth, pageHeight, margin, startY: yPosition });
        yPosition += 10;
      }
    }

    // Sauvegarder le PDF
    pdf.save(`${filename}.pdf`);

    // Retirer le message de chargement
    document.body.removeChild(loadingDiv);

    return true;
  } catch (error) {
    console.error('Erreur lors de l\'export PDF:', error);
    const loadingDiv = document.getElementById('pdf-loading');
    if (loadingDiv) {
      document.body.removeChild(loadingDiv);
    }
    alert('Erreur lors de la génération du PDF');
    return false;
  }
}

/**
 * Exporte une section de la page en PDF (fonction existante conservée pour compatibilité)
 * @param elementId - ID de l'élément HTML à capturer
 * @param filename - Nom du fichier PDF (sans extension)
 * @param options - Options supplémentaires
 */
export async function exportToPDF(
  elementId: string,
  filename: string,
  options?: {
    orientation?: 'portrait' | 'landscape';
    format?: 'a4' | 'letter';
    scale?: number;
    includeHeader?: boolean;
    headerText?: string;
  }
) {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Element with id "${elementId}" not found`);
    }

    // Afficher un message de chargement
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'pdf-loading';
    loadingDiv.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 20px 40px;
      border-radius: 10px;
      z-index: 9999;
      font-size: 18px;
      font-weight: bold;
    `;
    loadingDiv.textContent = 'Génération du PDF...';
    document.body.appendChild(loadingDiv);

    // Capturer l'élément en canvas
    const canvas = await html2canvas(element, {
      scale: options?.scale || 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight
    });

    // Créer le PDF
    const imgWidth = options?.orientation === 'landscape' ? 297 : 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    const pdf = new jsPDF({
      orientation: options?.orientation || 'portrait',
      unit: 'mm',
      format: options?.format || 'a4'
    });

    // Ajouter un en-tête si demandé
    if (options?.includeHeader && options?.headerText) {
      pdf.setFontSize(16);
      pdf.setTextColor(0, 0, 0);
      pdf.text(options.headerText, 105, 15, { align: 'center' });
    }

    // Calculer la position de l'image
    const yOffset = options?.includeHeader ? 25 : 10;
    const pageHeight = options?.orientation === 'landscape' ? 210 : 297;
    let heightLeft = imgHeight;
    let position = yOffset;

    // Ajouter l'image au PDF (avec pagination si nécessaire)
    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', 10, position, imgWidth - 20, imgHeight);
    heightLeft -= pageHeight - yOffset;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 10, position, imgWidth - 20, imgHeight);
      heightLeft -= pageHeight;
    }

    // Ajouter la date en bas de chaque page
    const totalPages = pdf.internal.pages.length - 1;
    const date = new Date().toLocaleDateString('fr-FR');
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setTextColor(128, 128, 128);
      pdf.text(
        `Généré le ${date} - Page ${i}/${totalPages}`,
        105,
        pageHeight - 10,
        { align: 'center' }
      );
    }

    // Sauvegarder le PDF
    pdf.save(`${filename}.pdf`);

    // Retirer le message de chargement
    document.body.removeChild(loadingDiv);

    return true;
  } catch (error) {
    console.error('Erreur lors de l\'export PDF:', error);
    const loadingDiv = document.getElementById('pdf-loading');
    if (loadingDiv) {
      document.body.removeChild(loadingDiv);
    }
    alert('Erreur lors de la génération du PDF. Veuillez réessayer.');
    return false;
  }
}

/**
 * Exporte des données tabulaires en PDF
 * @param title - Titre du document
 * @param headers - En-têtes des colonnes
 * @param data - Données (tableau de tableaux)
 * @param filename - Nom du fichier PDF
 */
export function exportTableToPDF(
  title: string,
  headers: string[],
  data: any[][],
  filename: string
) {
  try {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    
    // Titre
    pdf.setFontSize(18);
    pdf.setTextColor(0, 0, 0);
    pdf.text(title, pageWidth / 2, 20, { align: 'center' });

    // Date
    pdf.setFontSize(10);
    pdf.setTextColor(128, 128, 128);
    pdf.text(new Date().toLocaleDateString('fr-FR'), pageWidth / 2, 28, { align: 'center' });

    // Tableau
    let yPosition = 40;
    const colWidth = (pageWidth - 20) / headers.length;
    
    // En-têtes
    pdf.setFontSize(10);
    pdf.setTextColor(255, 255, 255);
    pdf.setFillColor(59, 130, 246); // Bleu
    pdf.rect(10, yPosition, pageWidth - 20, 8, 'F');
    
    headers.forEach((header, i) => {
      pdf.text(header, 12 + i * colWidth, yPosition + 5.5);
    });
    
    yPosition += 8;

    // Données
    pdf.setTextColor(0, 0, 0);
    data.forEach((row, rowIndex) => {
      // Vérifier si on doit ajouter une nouvelle page
      if (yPosition > pageHeight - 20) {
        pdf.addPage();
        yPosition = 20;
        
        // Réafficher les en-têtes
        pdf.setTextColor(255, 255, 255);
        pdf.setFillColor(59, 130, 246);
        pdf.rect(10, yPosition, pageWidth - 20, 8, 'F');
        headers.forEach((header, i) => {
          pdf.text(header, 12 + i * colWidth, yPosition + 5.5);
        });
        yPosition += 8;
        pdf.setTextColor(0, 0, 0);
      }

      // Alterner les couleurs de ligne
      if (rowIndex % 2 === 0) {
        pdf.setFillColor(245, 245, 245);
        pdf.rect(10, yPosition, pageWidth - 20, 7, 'F');
      }

      row.forEach((cell, i) => {
        const text = String(cell || '');
        pdf.text(text, 12 + i * colWidth, yPosition + 5, {
          maxWidth: colWidth - 4
        });
      });

      yPosition += 7;
    });

    // Pied de page
    const totalPages = pdf.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setTextColor(128, 128, 128);
      pdf.text(
        `Page ${i}/${totalPages}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    }

    pdf.save(`${filename}.pdf`);
    return true;
  } catch (error) {
    console.error('Erreur lors de l\'export PDF:', error);
    alert('Erreur lors de la génération du PDF. Veuillez réessayer.');
    return false;
  }
}
