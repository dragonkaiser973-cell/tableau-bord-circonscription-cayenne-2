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
            
            const titleImgData = titleCanvas.toDataURL('image/png');
            const titleImgWidth = pageWidth - (2 * margin);
            const titleImgHeight = (titleCanvas.height * titleImgWidth) / titleCanvas.width;
            
            // Ajouter le titre
            if (yPosition + titleImgHeight > pageHeight - margin && i > 0) {
              pdf.addPage();
              yPosition = margin;
            }
            
            pdf.addImage(titleImgData, 'PNG', margin, yPosition, titleImgWidth, titleImgHeight);
            yPosition += titleImgHeight + 5;
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
            
            const subImgData = subCanvas.toDataURL('image/png');
            const subImgWidth = pageWidth - (2 * margin);
            const subImgHeight = (subCanvas.height * subImgWidth) / subCanvas.width;
            
            // Vérifier si on a besoin d'une nouvelle page
            if (yPosition + subImgHeight > pageHeight - margin) {
              pdf.addPage();
              yPosition = margin;
            }
            
            pdf.addImage(subImgData, 'PNG', margin, yPosition, subImgWidth, subImgHeight);
            yPosition += subImgHeight + 5;
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

        const imgData = canvas.toDataURL('image/png');
        const imgWidth = pageWidth - (2 * margin);
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        // Vérifier si on a besoin d'une nouvelle page
        if (yPosition + imgHeight > pageHeight - margin && i > 0) {
          pdf.addPage();
          yPosition = margin;
        }

        // Ajouter l'image au PDF
        pdf.addImage(imgData, 'PNG', margin, yPosition, imgWidth, imgHeight);
        yPosition += imgHeight + 10;

        // Ajouter une nouvelle page si ce n'est pas le dernier élément
        if (i < selectedElements.length - 1 && yPosition > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
        }
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
