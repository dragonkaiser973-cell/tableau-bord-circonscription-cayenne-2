# Résolution Problème Exécution PowerShell

## ❌ Erreur

```
The file UPDATE-ANNEE.ps1 is not digitally signed. You cannot run this script on the current system.
```

## ✅ Solutions (3 méthodes)

### **Solution 1 : Bypass Temporaire (RECOMMANDÉ - Simple)**

Exécutez le script avec bypass de la politique :

```powershell
PowerShell -ExecutionPolicy Bypass -File .\UPDATE-ANNEE.ps1 -OldYear "2024-2025" -NewYear "2025-2026"
```

✅ **Avantages :**
- Pas besoin de droits admin
- Fonctionne immédiatement
- Ne modifie pas les paramètres système

---

### **Solution 2 : Modifier la Politique (Session Actuelle)**

Autoriser les scripts pour cette session PowerShell seulement :

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

Puis exécutez normalement :
```powershell
.\UPDATE-ANNEE.ps1 -OldYear "2024-2025" -NewYear "2025-2026"
```

✅ **Avantages :**
- Valable uniquement pour cette fenêtre PowerShell
- Revient à la normale en fermant la fenêtre

---

### **Solution 3 : Copier/Coller le Code (Plus Simple)**

Ouvrez PowerShell et copiez-collez directement ce code :

```powershell
# Configuration
$OldYear = "2024-2025"
$NewYear = "2025-2026"

Write-Host "🔧 Mise à jour de l'année scolaire" -ForegroundColor Cyan
Write-Host "   De : $OldYear" -ForegroundColor Yellow
Write-Host "   Vers : $NewYear" -ForegroundColor Green
Write-Host ""

# Fonction pour mettre à jour un fichier
function Update-File {
    param([string]$FileName)
    
    $filePath = "data\$FileName"
    
    if (-not (Test-Path $filePath)) {
        Write-Host "⚠️  $FileName n'existe pas" -ForegroundColor Yellow
        return
    }
    
    # Sauvegarde
    Copy-Item $filePath "$filePath.backup" -Force
    
    # Lire et remplacer
    $content = Get-Content $filePath -Raw -Encoding UTF8
    $oldContent = $content
    $content = $content -replace "`"annee_scolaire`": `"$OldYear`"", "`"annee_scolaire`": `"$NewYear`""
    
    # Compter
    $matches = ([regex]::Matches($oldContent, "`"annee_scolaire`": `"$OldYear`"")).Count
    
    if ($matches -gt 0) {
        Set-Content $filePath $content -Encoding UTF8
        Write-Host "✅ $FileName : $matches ligne(s) mise(s) à jour" -ForegroundColor Green
    } else {
        Write-Host "ℹ️  $FileName : aucune modification" -ForegroundColor Cyan
        Remove-Item "$filePath.backup" -Force
    }
}

# Mise à jour
Update-File "enseignants.json"
Update-File "statistiques_ecoles.json"
Update-File "ecoles_structure.json"

Write-Host ""
Write-Host "✅ Terminé ! Relancez l'app : npm start" -ForegroundColor Green
```

---

### **Solution 4 : Modification Manuelle (Sans Script)**

Si vous préférez éviter PowerShell complètement :

#### **Avec Notepad++ ou VS Code :**

1. **Ouvrir** `data\enseignants.json`
2. **Ctrl + H** (Rechercher/Remplacer)
3. **Rechercher :** `"annee_scolaire": "2024-2025"`
4. **Remplacer par :** `"annee_scolaire": "2025-2026"`
5. **Remplacer tout**
6. **Sauvegarder**

Répéter pour `data\statistiques_ecoles.json`

---

## 🎯 Recommandation

**Pour une utilisation ponctuelle :**
→ Utilisez **Solution 1** (Bypass) ou **Solution 3** (Copier/Coller)

**Pour modifier la politique de façon permanente (déconseillé pour la sécurité) :**
```powershell
# ADMIN REQUIS
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

---

## 🔄 Commande Complète Prête à l'Emploi

Copiez-collez cette ligne dans PowerShell :

```powershell
PowerShell -ExecutionPolicy Bypass -File .\UPDATE-ANNEE.ps1 -OldYear "2024-2025" -NewYear "2025-2026"
```

Ou pour changer vers 2026-2027 :

```powershell
PowerShell -ExecutionPolicy Bypass -File .\UPDATE-ANNEE.ps1 -OldYear "2025-2026" -NewYear "2026-2027"
```

---

## ✅ Après Mise à Jour

```powershell
# 1. Relancer l'application
npm start

# 2. Ouvrir http://localhost:3000

# 3. Aller sur "Pilotage"

# 4. Vérifier que l'année affichée est correcte
```

---

## 📝 Note Importante

Les fichiers `.backup` sont créés automatiquement. En cas de problème :

```powershell
# Restaurer les sauvegardes
Copy-Item data\enseignants.json.backup data\enseignants.json -Force
Copy-Item data\statistiques_ecoles.json.backup data\statistiques_ecoles.json -Force
```

Puis relancer l'app.

---

**La solution la plus simple : Copier/Coller le code (Solution 3) !** 🚀
