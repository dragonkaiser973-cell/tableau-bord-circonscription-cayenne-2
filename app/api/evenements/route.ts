import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const dataDir = path.join(process.cwd(), 'data');
const evenementsFile = path.join(dataDir, 'evenements.json');

// S'assurer que le dossier data existe
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Lire les événements
function readEvenements() {
  try {
    if (fs.existsSync(evenementsFile)) {
      const data = fs.readFileSync(evenementsFile, 'utf-8');
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error('Erreur lecture événements:', error);
    return [];
  }
}

// Écrire les événements
function writeEvenements(evenements: any[]) {
  try {
    fs.writeFileSync(evenementsFile, JSON.stringify(evenements, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Erreur écriture événements:', error);
    return false;
  }
}

// GET - Récupérer tous les événements
export async function GET() {
  try {
    const evenements = readEvenements();
    return NextResponse.json(evenements);
  } catch (error) {
    return NextResponse.json({ error: 'Erreur lors de la lecture des événements' }, { status: 500 });
  }
}

// POST - Créer un événement
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { titre, type, dateDebut, dateFin, lieu } = body;

    if (!titre || !type || !dateDebut) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 });
    }

    const evenements = readEvenements();
    const newEvent = {
      id: Date.now().toString(),
      titre,
      type, // 'rendez-vous', 'formation', 'reunion'
      dateDebut,
      dateFin: dateFin || dateDebut,
      lieu: lieu || '',
      created_at: new Date().toISOString()
    };

    evenements.push(newEvent);
    writeEvenements(evenements);

    return NextResponse.json({ success: true, event: newEvent });
  } catch (error) {
    return NextResponse.json({ error: 'Erreur lors de la création de l\'événement' }, { status: 500 });
  }
}

// DELETE - Supprimer un événement
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID manquant' }, { status: 400 });
    }

    const evenements = readEvenements();
    const filtered = evenements.filter((e: any) => e.id !== id);
    
    if (filtered.length === evenements.length) {
      return NextResponse.json({ error: 'Événement non trouvé' }, { status: 404 });
    }

    writeEvenements(filtered);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 });
  }
}

// PUT - Modifier un événement
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, titre, type, dateDebut, dateFin, lieu } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID manquant' }, { status: 400 });
    }

    const evenements = readEvenements();
    const index = evenements.findIndex((e: any) => e.id === id);
    
    if (index === -1) {
      return NextResponse.json({ error: 'Événement non trouvé' }, { status: 404 });
    }

    evenements[index] = {
      ...evenements[index],
      titre,
      type,
      dateDebut,
      dateFin: dateFin || dateDebut,
      lieu: lieu || '',
      updated_at: new Date().toISOString()
    };

    writeEvenements(evenements);
    return NextResponse.json({ success: true, event: evenements[index] });
  } catch (error) {
    return NextResponse.json({ error: 'Erreur lors de la modification' }, { status: 500 });
  }
}
