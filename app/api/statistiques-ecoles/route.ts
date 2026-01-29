import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    // Lire depuis public/ (fichier importé via ZIP)
    const filePath = path.join(process.cwd(), 'public', 'statistiques_ecoles.json');
    const data = await readFile(filePath, 'utf-8');
    return NextResponse.json(JSON.parse(data));
  } catch (error) {
    console.error('Erreur lecture statistiques_ecoles.json:', error);
    return NextResponse.json([]);
  }
}
