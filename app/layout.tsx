import './globals.css'
import type { Metadata } from 'next'
import AlerteAnneeScolaire from '@/components/AlerteAnneeScolaire'
import Sidebar from '@/components/Sidebar'

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
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 min-w-0">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
