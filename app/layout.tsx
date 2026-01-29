import './globals.css'
import type { Metadata } from 'next'
import AlerteAnneeScolaire from '@/components/AlerteAnneeScolaire'

export const metadata: Metadata = {
  title: 'Tableau de bord - Circonscription Cayenne 2 Roura',
  description: 'Gestion des données de la circonscription Cayenne 2 Roura',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body>
        <AlerteAnneeScolaire />
        {children}
      </body>
    </html>
  )
}
