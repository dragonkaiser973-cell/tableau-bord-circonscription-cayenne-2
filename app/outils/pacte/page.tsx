'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AuroraHeader from '@/components/AuroraHeader';
import {
  LigneSuivi,
  MAX_LIGNES,
  MISSIONS,
  MISSIONS_SUIVI,
  MOIS_LABELS,
  MissionKey,
  PacteAttribution,
  PacteRepartition,
  PacteRepartitionPubliee,
  PacteSuivi,
  PacteSuiviPublie,
  computeRepartitionStats,
  computeSuiviStats,
  makeEmptyRepartition,
  makeEmptySuivi,
  moisKey,
  publicationToRepartition,
  publicationToSuivi,
  repartitionToApiPayload,
  suiviToApiPayload,
  totalHeuresLigne,
  totalParts,
} from './types';
import { exportRepartitionXlsx, exportSuiviXlsx } from './xlsx-io';

const STORAGE_KEY = 'pacte:v1';
const SUIVI_STORAGE_KEY = 'pacte-suivi:v1';
const LAST_DIRECTEUR_KEY = 'pacte:last-directeur';
const spring = { type: 'spring' as const, stiffness: 320, damping: 28 };

type Selection = { kind: 'draft'; id: string } | { kind: 'published'; ecoleId: string };
type Volet = 'repartition' | 'suivi';

type Directeur = { id: string; name: string; ecoleId: string; ecoleName: string };

function loadDrafts(): PacteRepartition[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PacteRepartition[];
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed.map((p) => {
      const safe = makeEmptyRepartition(p.id || crypto.randomUUID());
      safe.ecoleId = p.ecoleId ?? '';
      safe.directeurId = p.directeurId ?? '';
      safe.ecole = p.ecole ?? '';
      safe.auteur = p.auteur ?? '';
      safe.anneeN = p.anneeN ?? safe.anneeN;
      safe.lignes = Array.isArray(p.lignes)
        ? p.lignes.slice(0, MAX_LIGNES).map((l) => ({
            nom: String(l?.nom ?? ''),
            prenom: String(l?.prenom ?? ''),
            parts: l?.parts && typeof l.parts === 'object' ? l.parts : {},
          }))
        : [];
      safe.updatedAt = p.updatedAt ?? Date.now();
      return safe;
    });
  } catch {
    return null;
  }
}

function loadSuiviDrafts(): Record<string, PacteSuivi> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(SUIVI_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export default function PactePage() {
  const [volet, setVolet] = useState<Volet>('repartition');
  const [drafts, setDrafts] = useState<PacteRepartition[]>(() => [makeEmptyRepartition('p1')]);
  const [selection, setSelection] = useState<Selection>({ kind: 'draft', id: 'p1' });
  const [hydrated, setHydrated] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [directeurs, setDirecteurs] = useState<Directeur[]>([]);
  const [publications, setPublications] = useState<PacteRepartitionPubliee[]>([]);
  const [attributions, setAttributions] = useState<PacteAttribution[]>([]);
  const [suivisPublies, setSuivisPublies] = useState<PacteSuiviPublie[]>([]);
  const [suiviDrafts, setSuiviDrafts] = useState<Record<string, PacteSuivi>>({});
  const [moisIdx, setMoisIdx] = useState(0);
  const [anneeScolaire, setAnneeScolaire] = useState('2025-2026');
  const [enseignantsList, setEnseignantsList] = useState<{ nom: string; prenom: string; ecole_uai: string }[]>([]);
  const [ecolesIdentite, setEcolesIdentite] = useState<{ uai: string; sigle?: string; nom: string }[]>([]);
  const [publishing, setPublishing] = useState(false);

  // ── Hydratation locale ──
  useEffect(() => {
    const stored = loadDrafts();
    if (stored && stored.length > 0) {
      setDrafts(stored);
      setSelection({ kind: 'draft', id: stored[0].id });
    }
    setSuiviDrafts(loadSuiviDrafts());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts)); } catch { /* quota */ }
  }, [drafts, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(SUIVI_STORAGE_KEY, JSON.stringify(suiviDrafts)); } catch { /* quota */ }
  }, [suiviDrafts, hydrated]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  // ── Chargements serveur ──
  const refreshPublications = useCallback(async () => {
    try {
      const res = await fetch('/api/pacte/repartitions', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setPublications(data);
      }
    } catch { /* la page reste utilisable en brouillon */ }
  }, []);

  const refreshSuivis = useCallback(async () => {
    try {
      const res = await fetch('/api/pacte/suivis', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setSuivisPublies(data);
      }
    } catch { /* idem */ }
  }, []);

  useEffect(() => {
    refreshPublications();
    refreshSuivis();
    (async () => {
      try {
        const res = await fetch('/api/pacte/attributions');
        const data = await res.json();
        if (Array.isArray(data)) setAttributions(data);
      } catch { /* attributions indispo */ }
      try {
        const res = await fetch('/api/config');
        const cfg = await res.json();
        if (cfg?.annee_scolaire_actuelle) setAnneeScolaire(cfg.annee_scolaire_actuelle);
      } catch { /* défaut */ }
      try {
        const res = await fetch('/api/annuaire');
        const data = await res.json();
        const flat: Directeur[] = [];
        for (const ec of data?.ecoles ?? []) {
          for (const d of ec.directors ?? []) {
            flat.push({ id: d.id, name: d.name, ecoleId: ec.id, ecoleName: ec.name });
          }
        }
        flat.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
        setDirecteurs(flat);
      } catch { /* annuaire indispo */ }
      try {
        const res = await fetch('/api/enseignants');
        const data = await res.json();
        if (Array.isArray(data)) {
          const seen = new Set<string>();
          const list: { nom: string; prenom: string; ecole_uai: string }[] = [];
          for (const e of data) {
            const nom = String(e?.nom ?? '').trim();
            const prenom = String(e?.prenom ?? '').trim();
            const ecole_uai = String(e?.ecole_uai ?? '').trim();
            const k = `${nom}|${prenom}|${ecole_uai}`;
            if (nom && !seen.has(k)) { seen.add(k); list.push({ nom, prenom, ecole_uai }); }
          }
          list.sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
          setEnseignantsList(list);
        }
      } catch { /* liste enseignants indispo */ }
      try {
        const res = await fetch('/api/ecoles-identite');
        const data = await res.json();
        if (Array.isArray(data)) setEcolesIdentite(data);
      } catch { /* correspondance écoles indispo */ }
    })();
  }, [refreshPublications, refreshSuivis]);

  // Mois courant par défaut pour le suivi.
  useEffect(() => {
    const idx = [8, 9, 10, 11, 0, 1, 2, 3, 4, 5, 6].indexOf(new Date().getMonth());
    setMoisIdx(idx >= 0 ? idx : 0);
  }, []);

  // ── Sélection active (répartition) ──
  const active = useMemo<PacteRepartition | null>(() => {
    if (selection.kind === 'draft') {
      return drafts.find((p) => p.id === selection.id) ?? drafts[0] ?? null;
    }
    const pub = publications.find((p) => p.ecole_id === selection.ecoleId);
    if (!pub) return drafts[0] ?? null;
    return publicationToRepartition(pub, `pub:${pub.ecole_id}`);
  }, [selection, drafts, publications]);

  const readOnly = selection.kind === 'published';

  const attribution = useMemo(
    () => attributions.find((a) => a.ecole_id === active?.ecoleId) ?? null,
    [attributions, active?.ecoleId],
  );

  const stats = useMemo(
    () => (active ? computeRepartitionStats(active, attribution) : null),
    [active, attribution],
  );

  // ── Enseignants de l'école active ──
  // Un directeur ne peut attribuer de part qu'à un enseignant de son école.
  // L'annuaire (écoles des directeurs) n'a pas d'UAI : on retrouve la ou les
  // écoles correspondantes dans ecoles_identite par nom normalisé (départage
  // maternelle/élémentaire via le sigle), puis on filtre la table enseignants
  // par UAI. En cas d'échec de correspondance, la liste reste vide et le
  // directeur saisit ses enseignants avec « Ligne vide ».
  const enseignantsEcole = useMemo(() => {
    if (!active?.ecole) return [];
    const norm = (s: string) =>
      s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
    const full = norm(active.ecole);
    const kind = /\bMATERNELLE\b/.test(full) ? 'M' : /\bELEMENTAIRE\b/.test(full) ? 'E' : null;
    const tokens = full
      .replace(/\b(MATERNELLE|ELEMENTAIRE|PRIMAIRE|ECOLE|GROUPE|SCOLAIRE)\b/g, ' ')
      .split(' ')
      .filter((t) => t.length >= 3);
    if (tokens.length === 0) return [];
    const matches = ecolesIdentite.filter((e) => {
      const label = norm(`${e.sigle ?? ''} ${e.nom ?? ''}`);
      return tokens.every((t) => label.includes(t));
    });
    let retained = matches;
    if (kind && matches.length > 1) {
      const byKind = matches.filter((e) => {
        const isMat = norm(e.sigle ?? '').split(' ').includes('M') || norm(e.nom ?? '').includes('MATERNELLE');
        return kind === 'M' ? isMat : !isMat;
      });
      if (byKind.length > 0) retained = byKind;
    }
    const uais = new Set(retained.map((e) => e.uai));
    return enseignantsList.filter((e) => uais.has(e.ecole_uai));
  }, [active?.ecole, ecolesIdentite, enseignantsList]);

  const updateActive = useCallback(
    (mut: (p: PacteRepartition) => void) => {
      if (selection.kind !== 'draft') return;
      const draftId = selection.id;
      setDrafts((prev) =>
        prev.map((p) => {
          if (p.id !== draftId) return p;
          const clone: PacteRepartition = JSON.parse(JSON.stringify(p));
          mut(clone);
          clone.updatedAt = Date.now();
          return clone;
        }),
      );
    },
    [selection],
  );

  // Premier visiteur : bascule sur la publication la plus récente si les
  // brouillons sont vides (même comportement que prévision-structure).
  useEffect(() => {
    if (!hydrated || publications.length === 0) return;
    if (selection.kind !== 'draft') return;
    const allEmpty = drafts.every((p) => !p.directeurId && p.lignes.length === 0);
    if (!allEmpty) return;
    setSelection({ kind: 'published', ecoleId: publications[0].ecole_id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, publications]);

  // ── Suivi : fiche du mois pour l'école active ──
  const curMoisKey = moisKey(moisIdx, anneeScolaire);
  const suiviKeyOf = (ecoleId: string) => `${ecoleId}:${curMoisKey}`;

  const suiviPublie = useMemo(
    () => suivisPublies.find((s) => s.ecole_id === active?.ecoleId && s.mois === curMoisKey) ?? null,
    [suivisPublies, active?.ecoleId, curMoisKey],
  );

  // Le suivi affiché : brouillon local sinon publication sinon pré-remplissage
  // depuis les lignes de la répartition (enseignants avec parts « suivies »).
  const curSuivi = useMemo<PacteSuivi | null>(() => {
    if (!active?.ecoleId) return null;
    if (!readOnly) {
      const draft = suiviDrafts[suiviKeyOf(active.ecoleId)];
      if (draft) return { ...draft, ecole: active.ecole, auteur: active.auteur, directeurId: active.directeurId };
    }
    if (suiviPublie) return publicationToSuivi(suiviPublie);
    const base = makeEmptySuivi(active.ecoleId, curMoisKey);
    base.ecole = active.ecole;
    base.auteur = active.auteur;
    base.directeurId = active.directeurId;
    base.anneeN = anneeScolaire;
    base.lignes = active.lignes
      .filter((l) => MISSIONS_SUIVI.some((m) => (l.parts[m.key] || 0) > 0))
      .map((l) => ({ nom: l.nom, prenom: l.prenom, ecole: active.ecole, missions: {} }));
    return base;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, suiviDrafts, suiviPublie, curMoisKey, readOnly, anneeScolaire]);

  const suiviStats = useMemo(() => (curSuivi ? computeSuiviStats(curSuivi) : null), [curSuivi]);

  const updateSuivi = useCallback(
    (mut: (s: PacteSuivi) => void) => {
      if (!active?.ecoleId || readOnly || !curSuivi) return;
      const clone: PacteSuivi = JSON.parse(JSON.stringify(curSuivi));
      mut(clone);
      clone.ecoleId = active.ecoleId;
      clone.mois = curMoisKey;
      clone.ecole = active.ecole;
      clone.auteur = active.auteur;
      clone.directeurId = active.directeurId;
      clone.anneeN = anneeScolaire;
      clone.updatedAt = Date.now();
      setSuiviDrafts((prev) => ({ ...prev, [suiviKeyOf(active.ecoleId)]: clone }));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [active, readOnly, curSuivi, curMoisKey, anneeScolaire],
  );

  // ── Actions ──
  const addEcole = () => {
    const id = crypto.randomUUID();
    const fresh = makeEmptyRepartition(id);
    fresh.anneeN = anneeScolaire;
    try {
      const lastId = localStorage.getItem(LAST_DIRECTEUR_KEY);
      const d = directeurs.find((x) => x.id === lastId);
      if (d) {
        fresh.directeurId = d.id;
        fresh.ecoleId = d.ecoleId;
        fresh.auteur = d.name;
        fresh.ecole = d.ecoleName;
      }
    } catch { /* localStorage indispo */ }
    setDrafts((p) => [...p, fresh]);
    setSelection({ kind: 'draft', id });
  };

  const removeDraft = (id: string) => {
    setDrafts((prev) => {
      const next = prev.filter((p) => p.id !== id);
      if (next.length === 0) {
        const empty = makeEmptyRepartition(crypto.randomUUID());
        setSelection({ kind: 'draft', id: empty.id });
        return [empty];
      }
      if (selection.kind === 'draft' && id === selection.id) {
        setSelection({ kind: 'draft', id: next[0].id });
      }
      return next;
    });
  };

  const onEditPublication = () => {
    if (selection.kind !== 'published') return;
    const pub = publications.find((p) => p.ecole_id === selection.ecoleId);
    if (!pub) return;
    const existing = drafts.find((p) => p.ecoleId === pub.ecole_id);
    if (existing) {
      setSelection({ kind: 'draft', id: existing.id });
      setToast('Brouillon existant chargé.');
      return;
    }
    const draft = publicationToRepartition(pub, crypto.randomUUID());
    setDrafts((prev) => [...prev, draft]);
    setSelection({ kind: 'draft', id: draft.id });
    setToast('Fiche chargée — republiez pour mettre à jour la version visible.');
  };

  const onPickDirecteur = (id: string) => {
    if (!id) {
      updateActive((p) => Object.assign(p, { directeurId: '', ecoleId: '', auteur: '', ecole: '' }));
      return;
    }
    const d = directeurs.find((x) => x.id === id);
    if (!d) return;
    updateActive((p) => Object.assign(p, { directeurId: d.id, ecoleId: d.ecoleId, auteur: d.name, ecole: d.ecoleName }));
    try { localStorage.setItem(LAST_DIRECTEUR_KEY, d.id); } catch { /* */ }
  };

  const canPublish = !readOnly && Boolean(active?.directeurId && active?.ecoleId);

  const onPublishRepartition = async () => {
    if (!active || !canPublish || publishing || selection.kind !== 'draft') return;
    const draftId = selection.id;
    const ecoleId = active.ecoleId;
    setPublishing(true);
    try {
      const res = await fetch('/api/pacte/repartitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(repartitionToApiPayload(active)),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setToast(err?.message || 'Publication impossible.');
        return;
      }
      await refreshPublications();
      setDrafts((prev) => prev.filter((d) => d.id !== draftId));
      setSelection({ kind: 'published', ecoleId });
      setToast(`« ${active.ecole} » est publiée — visible par tous.`);
    } catch {
      setToast('Publication impossible — vérifiez la connexion.');
    } finally {
      setPublishing(false);
    }
  };

  const onPublishSuivi = async () => {
    if (!curSuivi || !canPublish || publishing || !active) return;
    setPublishing(true);
    try {
      const res = await fetch('/api/pacte/suivis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(suiviToApiPayload(curSuivi)),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setToast(err?.message || 'Publication impossible.');
        return;
      }
      await refreshSuivis();
      setSuiviDrafts((prev) => {
        const next = { ...prev };
        delete next[suiviKeyOf(active.ecoleId)];
        return next;
      });
      setToast(`Suivi de ${MOIS_LABELS[moisIdx]} publié.`);
    } catch {
      setToast('Publication impossible — vérifiez la connexion.');
    } finally {
      setPublishing(false);
    }
  };

  const onExport = async () => {
    if (!active?.ecoleId) {
      setToast('Sélectionnez votre nom dans la liste avant d’exporter.');
      return;
    }
    try {
      if (volet === 'repartition') await exportRepartitionXlsx(active, attribution);
      else if (curSuivi) await exportSuiviXlsx(curSuivi);
      setToast('Export généré.');
    } catch {
      setToast("L'export a échoué.");
    }
  };

  if (!active || !stats) return null;

  const suiviReadOnly = readOnly;

  return (
    <div className="min-h-screen bg-slate-50">
      <AuroraHeader
        kicker={`Outil directeurs · PACTE ${anneeScolaire}`}
        title="Gestion du"
        titleAccent="PACTE."
        subtitle="Répartir les parts fonctionnelles attribuées à l'école entre les enseignants volontaires, puis déclarer chaque mois les heures effectuées."
        backLabel="Retour à l'accueil"
        padding="py-10 md:py-12"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <TopBtn onClick={onExport} icon={<DownloadIcon />} label="Exporter .xlsx" disabled={!active.ecoleId} />
            {readOnly ? (
              <TopBtn onClick={onEditPublication} icon={<EditIcon />} label="Modifier cette fiche" primary />
            ) : (
              <TopBtn
                onClick={volet === 'repartition' ? onPublishRepartition : onPublishSuivi}
                icon={publishing ? <SpinnerIcon /> : <SendIcon />}
                label={publishing ? 'Publication…' : volet === 'repartition' ? 'Publier la répartition' : 'Publier le suivi'}
                primary
                disabled={!canPublish || publishing}
                disabledTitle="Sélectionnez votre nom dans la liste pour publier."
              />
            )}
          </div>
        }
      >
        <div className="flex flex-col gap-3">
          {/* Onglets volets */}
          <div className="inline-flex self-start rounded-full bg-white/10 border border-white/20 p-1">
            {(['repartition', 'suivi'] as Volet[]).map((v) => (
              <button
                key={v}
                onClick={() => setVolet(v)}
                className={`px-4 py-1.5 rounded-full text-[12px] font-semibold tracking-wide transition-all ${
                  volet === v ? 'bg-white text-primary-700 shadow' : 'text-white/75 hover:text-white'
                }`}
              >
                {v === 'repartition' ? 'Répartition des parts' : 'Suivi mensuel'}
              </button>
            ))}
          </div>

          {/* Pills écoles */}
          <div className="flex flex-col gap-2">
            {publications.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-semibold tracking-[0.18em] uppercase text-white/50 mr-1">
                  Publiées ({publications.length})
                </span>
                {publications.map((pub) => {
                  const isActive = selection.kind === 'published' && selection.ecoleId === pub.ecole_id;
                  return (
                    <button
                      key={pub.ecole_id}
                      onClick={() => setSelection({ kind: 'published', ecoleId: pub.ecole_id })}
                      title={`Publiée le ${new Date(pub.published_at).toLocaleDateString('fr-FR')} par ${pub.directeur_name}`}
                      className={`inline-flex items-center gap-2 px-3 py-2 md:py-1.5 rounded-full border text-[11px] font-semibold tracking-wide transition-all cursor-pointer active:scale-95 ${
                        isActive
                          ? 'bg-gradient-to-r from-teal-400 to-cyan-500 text-white border-transparent shadow-lg shadow-black/20'
                          : 'bg-white/10 border-white/15 text-white/85 hover:bg-white/15 hover:text-white'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-white' : 'bg-teal-300'}`} />
                      <span className="truncate max-w-[220px]">{pub.ecole_name}</span>
                    </button>
                  );
                })}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-semibold tracking-[0.18em] uppercase text-white/50 mr-1">
                Mes brouillons ({drafts.length})
              </span>
              {drafts.map((p) => {
                const isActive = selection.kind === 'draft' && p.id === selection.id;
                return (
                  <span
                    key={p.id}
                    onClick={() => setSelection({ kind: 'draft', id: p.id })}
                    className={`inline-flex items-center gap-2 px-3 py-2 md:py-1.5 rounded-full border-2 border-dashed text-[11px] font-semibold tracking-wide transition-all cursor-pointer active:scale-95 ${
                      isActive
                        ? 'bg-gradient-to-r from-teal-400 to-cyan-500 text-white border-white/50 shadow-lg'
                        : 'bg-white/5 border-white/20 text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span className="truncate max-w-[220px]">{p.ecole.trim() || 'Nouvelle école'}</span>
                    {drafts.length > 1 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); removeDraft(p.id); }}
                        aria-label="Supprimer ce brouillon"
                        className="w-4 h-4 inline-flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/20"
                      >
                        <XIcon />
                      </button>
                    )}
                  </span>
                );
              })}
              <button
                onClick={addEcole}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-dashed border-white/25 text-[11px] font-semibold text-white/70 hover:text-white hover:border-white/40 hover:bg-white/5 transition-all cursor-pointer active:scale-95"
              >
                <PlusIcon /> Ajouter une école
              </button>
            </div>
          </div>
        </div>
      </AuroraHeader>

      <main className="mx-auto w-full max-w-[1500px] px-4 md:px-6 pb-16 relative z-10">
        {/* ── Identité ── */}
        <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <label className="flex flex-col gap-1.5 md:col-span-6">
              <span className="text-[11px] font-bold tracking-[0.15em] uppercase text-slate-500">
                Directeur / directrice
              </span>
              {readOnly ? (
                <div className="flex items-center gap-2 rounded-xl border bg-slate-100 border-slate-200 px-3 py-2 text-sm text-slate-900">
                  <LockIcon />
                  <span className="truncate">{active.auteur || '—'}</span>
                </div>
              ) : (
                <div
                  className={`relative rounded-xl border transition-all ${
                    active.directeurId ? 'bg-emerald-50/40 border-emerald-200' : 'bg-amber-50/40 border-amber-200 ring-1 ring-amber-100'
                  }`}
                >
                  <select
                    value={active.directeurId}
                    onChange={(e) => onPickDirecteur(e.target.value)}
                    className="w-full appearance-none bg-transparent px-3 py-2 pr-9 text-sm font-medium text-slate-900 outline-none cursor-pointer"
                  >
                    <option value="">— Choisissez votre nom —</option>
                    {directeurs.map((d) => (
                      <option key={d.id} value={d.id}>{d.name} · {d.ecoleName}</option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"><ChevronDownIcon /></span>
                </div>
              )}
            </label>
            <label className="flex flex-col gap-1.5 md:col-span-4">
              <span className="text-[11px] font-bold tracking-[0.15em] uppercase text-slate-500">École</span>
              <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
                active.ecole ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-50/60 border-dashed border-slate-200 text-slate-400 italic'
              }`}>
                {active.ecole ? (<><LockIcon /><span className="truncate">{active.ecole}</span></>) : <span>Sera renseignée automatiquement</span>}
              </div>
            </label>
            <label className="flex flex-col gap-1.5 md:col-span-2">
              <span className="text-[11px] font-bold tracking-[0.15em] uppercase text-slate-500">Année scolaire</span>
              <div className="rounded-xl border bg-slate-50 border-slate-200 px-3 py-2 text-sm text-slate-900">{anneeScolaire}</div>
            </label>
          </div>
          {!readOnly && !active.directeurId && (
            <p className="mt-2 text-[12px] text-slate-500 flex items-center gap-1.5">
              <span className="inline-flex w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
              Sélectionnez votre nom pour débloquer la publication.
              <span className="text-slate-400">· Mon nom n’est pas dans la liste ? Contactez le CPC numérique.</span>
            </p>
          )}
        </section>

        {volet === 'repartition' ? (
          <RepartitionVolet
            p={active}
            stats={stats}
            hasAttribution={Boolean(attribution)}
            readOnly={readOnly}
            enseignantsList={enseignantsEcole}
            updateActive={updateActive}
          />
        ) : (
          <SuiviVolet
            suivi={curSuivi}
            suiviStats={suiviStats}
            suiviPublie={suiviPublie}
            readOnly={suiviReadOnly}
            moisIdx={moisIdx}
            setMoisIdx={setMoisIdx}
            anneeScolaire={anneeScolaire}
            updateSuivi={updateSuivi}
            enseignantsList={enseignantsEcole}
          />
        )}
      </main>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={spring}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-2xl bg-slate-900/95 backdrop-blur-md text-white px-5 py-3 text-sm font-medium shadow-xl border border-white/10"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Volet Répartition ──────────────────────────────────────────────────── */

function RepartitionVolet({
  p,
  stats,
  hasAttribution,
  readOnly,
  enseignantsList,
  updateActive,
}: {
  p: PacteRepartition;
  stats: ReturnType<typeof computeRepartitionStats>;
  hasAttribution: boolean;
  readOnly: boolean;
  enseignantsList: { nom: string; prenom: string }[];
  updateActive: (mut: (p: PacteRepartition) => void) => void;
}) {
  const [pick, setPick] = useState('');

  const addLigne = (nom = '', prenom = '') => {
    updateActive((d) => {
      if (d.lignes.length >= MAX_LIGNES) return;
      d.lignes.push({ nom, prenom, parts: {} });
    });
  };

  const onPickEnseignant = (v: string) => {
    setPick('');
    if (!v) return;
    const [nom, prenom] = v.split('|');
    addLigne(nom, prenom || '');
  };

  return (
    <>
      {/* Bandeau attribué / réparti */}
      <section className="bg-white rounded-3xl border border-slate-200 shadow-sm mt-6 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="font-[Outfit,sans-serif] font-bold text-slate-900 tracking-tight">Parts attribuées vs réparties</h2>
          <p className="text-xs text-slate-500">
            {p.ecoleId
              ? hasAttribution
                ? "Les parts attribuées sont fixées par l'IEN — répartissez-les dans le tableau ci-dessous."
                : "Aucune attribution enregistrée pour votre école pour l'instant — contactez la circonscription."
              : 'Sélectionnez votre nom pour afficher les parts attribuées à votre école.'}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-slate-50/60">
                <th className="text-left text-[11px] font-bold uppercase tracking-[0.12em] text-slate-600 px-4 py-2 border-b border-slate-200 min-w-[140px]" />
                {MISSIONS.map((m) => (
                  <th key={m.key} className="text-[11px] font-bold uppercase text-slate-600 px-2 py-2 border-b border-slate-200 min-w-[110px]">
                    {m.shortLabel}
                  </th>
                ))}
                <th className="text-[11px] font-bold uppercase text-slate-600 px-2 py-2 border-b border-slate-200 min-w-[80px]">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100 bg-teal-50/40">
                <td className="px-4 py-2 text-sm font-bold text-slate-700">Attribué (IEN)</td>
                {MISSIONS.map((m) => (
                  <td key={m.key} className="px-2 py-2 text-center text-sm font-bold tabular-nums text-teal-800">
                    {stats.attribueParMission[m.key]}
                  </td>
                ))}
                <td className="px-2 py-2 text-center text-sm font-bold tabular-nums text-teal-800">{stats.totalAttribue}</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-sm font-bold text-slate-700">Réparti</td>
                {MISSIONS.map((m) => {
                  const over = stats.repartiParMission[m.key] > stats.attribueParMission[m.key];
                  return (
                    <td key={m.key} className={`px-2 py-2 text-center text-sm font-bold tabular-nums ${over ? 'text-rose-600' : 'text-slate-800'}`}>
                      {stats.repartiParMission[m.key]}
                      {over && <span title="Dépasse l'attribué" className="ml-1">⚠</span>}
                    </td>
                  );
                })}
                <td className={`px-2 py-2 text-center text-sm font-bold tabular-nums ${stats.totalReparti > stats.totalAttribue ? 'text-rose-600' : 'text-slate-800'}`}>
                  {stats.totalReparti}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        {stats.depassements.length > 0 && (
          <div className="mx-6 mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-800">
            <strong>Attention :</strong> la répartition dépasse l&apos;attribué sur{' '}
            {stats.depassements.map((k) => MISSIONS.find((m) => m.key === k)?.shortLabel).join(', ')}.
          </div>
        )}
      </section>

      {/* Tableau de répartition */}
      <section className="bg-white rounded-3xl border border-slate-200 shadow-sm mt-6 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="font-[Outfit,sans-serif] font-bold text-slate-900 tracking-tight">Répartition par enseignant</h2>
            <p className="text-xs text-slate-500">
              {stats.nbEnseignants} enseignant{stats.nbEnseignants > 1 ? 's' : ''} avec parts · {p.lignes.length}/{MAX_LIGNES} lignes
            </p>
          </div>
          {!readOnly && (
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={pick}
                onChange={(e) => onPickEnseignant(e.target.value)}
                disabled={p.lignes.length >= MAX_LIGNES || enseignantsList.length === 0}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-primary-400 max-w-[300px] disabled:opacity-60"
              >
                <option value="">
                  {!p.ecoleId
                    ? 'Sélectionnez d’abord votre nom…'
                    : enseignantsList.length === 0
                    ? 'Aucun enseignant trouvé pour votre école'
                    : '+ Ajouter un enseignant de mon école…'}
                </option>
                {enseignantsList.map((e, i) => (
                  <option key={`${e.nom}|${e.prenom}|${i}`} value={`${e.nom}|${e.prenom}`}>
                    {e.nom} {e.prenom}
                  </option>
                ))}
              </select>
              <button
                onClick={() => addLigne()}
                disabled={p.lignes.length >= MAX_LIGNES}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-40 text-white px-3 py-2 text-sm font-medium transition-colors"
              >
                <PlusIcon /> Ligne vide
              </button>
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-slate-50/60">
                <th className="text-left text-[11px] font-bold uppercase text-slate-600 px-4 py-2 border-b border-slate-200 min-w-[160px]">Nom</th>
                <th className="text-left text-[11px] font-bold uppercase text-slate-600 px-2 py-2 border-b border-slate-200 min-w-[130px]">Prénom</th>
                {MISSIONS.map((m) => (
                  <th key={m.key} title={m.label} className="text-[11px] font-bold uppercase text-slate-600 px-2 py-2 border-b border-slate-200 min-w-[105px]">
                    {m.shortLabel}
                  </th>
                ))}
                <th className="text-[11px] font-bold uppercase text-slate-600 px-2 py-2 border-b border-slate-200 min-w-[70px]">Parts</th>
                {!readOnly && <th className="border-b border-slate-200 w-10" />}
              </tr>
            </thead>
            <tbody>
              {p.lignes.length === 0 && (
                <tr>
                  <td colSpan={MISSIONS.length + 4} className="px-4 py-8 text-center text-sm text-slate-400">
                    {readOnly ? 'Aucun enseignant dans cette fiche.' : 'Ajoutez les enseignants volontaires avec les boutons ci-dessus.'}
                  </td>
                </tr>
              )}
              {p.lignes.map((l, li) => (
                <tr key={li} className="border-b border-slate-100 hover:bg-slate-50/50">
                  <td className="px-2 py-1">
                    <TextInput value={l.nom} readOnly={readOnly} onChange={(v) => updateActive((d) => void (d.lignes[li].nom = v))} placeholder="NOM" />
                  </td>
                  <td className="px-2 py-1">
                    <TextInput value={l.prenom} readOnly={readOnly} onChange={(v) => updateActive((d) => void (d.lignes[li].prenom = v))} placeholder="Prénom" />
                  </td>
                  {MISSIONS.map((m) => (
                    <td key={m.key} className="px-1 py-1">
                      <NumCell
                        value={l.parts[m.key] || 0}
                        readOnly={readOnly}
                        decimals
                        onChange={(v) =>
                          updateActive((d) => {
                            if (v > 0) d.lignes[li].parts[m.key] = v;
                            else delete d.lignes[li].parts[m.key];
                          })
                        }
                      />
                    </td>
                  ))}
                  <td className="px-2 py-1 text-center text-sm font-bold tabular-nums text-slate-800">{totalParts(l.parts) || ''}</td>
                  {!readOnly && (
                    <td className="px-1 py-1 text-center">
                      <button
                        onClick={() => updateActive((d) => void d.lignes.splice(li, 1))}
                        aria-label={`Supprimer la ligne ${l.nom || li + 1}`}
                        className="p-1.5 text-slate-300 hover:text-rose-600 transition-colors"
                      >
                        <TrashIcon />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            {p.lignes.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50/80">
                  <td colSpan={2} className="px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] text-slate-600 border-t border-slate-200">Total</td>
                  {MISSIONS.map((m) => (
                    <td key={m.key} className="px-2 py-2 text-center text-sm font-bold tabular-nums text-slate-900 border-t border-slate-200">
                      {stats.repartiParMission[m.key] || ''}
                    </td>
                  ))}
                  <td className="px-2 py-2 text-center text-sm font-bold tabular-nums text-slate-900 border-t border-slate-200">{stats.totalReparti}</td>
                  {!readOnly && <td className="border-t border-slate-200" />}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>
    </>
  );
}

/* ─── Volet Suivi mensuel ────────────────────────────────────────────────── */

function SuiviVolet({
  suivi,
  suiviStats,
  suiviPublie,
  readOnly,
  moisIdx,
  setMoisIdx,
  anneeScolaire,
  updateSuivi,
  enseignantsList,
}: {
  suivi: PacteSuivi | null;
  suiviStats: ReturnType<typeof computeSuiviStats> | null;
  suiviPublie: PacteSuiviPublie | null;
  readOnly: boolean;
  moisIdx: number;
  setMoisIdx: (fn: (i: number) => number) => void;
  anneeScolaire: string;
  updateSuivi: (mut: (s: PacteSuivi) => void) => void;
  enseignantsList: { nom: string; prenom: string }[];
}) {
  const [pick, setPick] = useState('');
  const [debut] = anneeScolaire.split('-').map(Number);
  const moisCal = [8, 9, 10, 11, 0, 1, 2, 3, 4, 5, 6][moisIdx];
  const anneeCal = moisCal >= 8 ? debut : debut + 1;

  if (!suivi || !suiviStats) {
    return (
      <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-10 mt-6 text-center text-sm text-slate-400">
        Sélectionnez votre nom (ou une fiche publiée) pour afficher le suivi mensuel.
      </section>
    );
  }

  const addLigne = (nom = '', prenom = '') => {
    updateSuivi((s) => {
      s.lignes.push({ nom, prenom, ecole: s.ecole, missions: {} });
    });
  };

  const onPickEnseignant = (v: string) => {
    setPick('');
    if (!v) return;
    const [nom, prenom] = v.split('|');
    addLigne(nom, prenom || '');
  };

  return (
    <section className="bg-white rounded-3xl border border-slate-200 shadow-sm mt-6 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMoisIdx((i) => Math.max(0, i - 1))}
            disabled={moisIdx === 0}
            aria-label="Mois précédent"
            className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 disabled:opacity-35 transition-all"
          >
            <ChevronLeftIcon />
          </button>
          <div className="min-w-[170px] text-center">
            <p className="font-[Outfit,sans-serif] font-bold text-slate-900 tracking-tight">
              {MOIS_LABELS[moisIdx]} {anneeCal}
            </p>
            <p className="text-[11px] text-slate-400">
              {suiviPublie
                ? `Publié le ${new Date(suiviPublie.published_at).toLocaleDateString('fr-FR')}`
                : 'Pas encore publié pour ce mois'}
            </p>
          </div>
          <button
            onClick={() => setMoisIdx((i) => Math.min(MOIS_LABELS.length - 1, i + 1))}
            disabled={moisIdx === MOIS_LABELS.length - 1}
            aria-label="Mois suivant"
            className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 disabled:opacity-35 transition-all"
          >
            <ChevronRightIcon />
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-slate-500">
            Total : <strong className="text-slate-900 tabular-nums">{suiviStats.totalHeures.toLocaleString('fr-FR')} h</strong>
          </span>
          {!readOnly && (
            <>
              <select
                value={pick}
                onChange={(e) => onPickEnseignant(e.target.value)}
                disabled={enseignantsList.length === 0}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-primary-400 max-w-[280px] disabled:opacity-60"
              >
                <option value="">
                  {enseignantsList.length === 0
                    ? 'Aucun enseignant trouvé pour votre école'
                    : '+ Ajouter un enseignant de mon école…'}
                </option>
                {enseignantsList.map((e, i) => (
                  <option key={`${e.nom}|${e.prenom}|${i}`} value={`${e.nom}|${e.prenom}`}>
                    {e.nom} {e.prenom}
                  </option>
                ))}
              </select>
              <button
                onClick={() => addLigne()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white px-3 py-2 text-sm font-medium transition-colors"
              >
                <PlusIcon /> Ligne vide
              </button>
            </>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-slate-50/60">
              <th rowSpan={2} className="text-left text-[11px] font-bold uppercase text-slate-600 px-4 py-2 border-b border-slate-200 min-w-[150px]">Nom</th>
              <th rowSpan={2} className="text-left text-[11px] font-bold uppercase text-slate-600 px-2 py-2 border-b border-slate-200 min-w-[120px]">Prénom</th>
              <th rowSpan={2} className="text-left text-[11px] font-bold uppercase text-slate-600 px-2 py-2 border-b border-slate-200 min-w-[140px]">École</th>
              {MISSIONS_SUIVI.map((m) => (
                <th key={m.key} colSpan={3} title={m.label} className="text-[11px] font-bold uppercase text-slate-600 px-2 py-1.5 border-b border-l border-slate-200">
                  {m.shortLabel}
                </th>
              ))}
              <th rowSpan={2} className="text-[11px] font-bold uppercase text-slate-600 px-2 py-2 border-b border-l border-slate-200 min-w-[70px]">Heures</th>
              {!readOnly && <th rowSpan={2} className="border-b border-slate-200 w-10" />}
            </tr>
            <tr className="bg-slate-50/60">
              {MISSIONS_SUIVI.map((m) => (
                <SuiviSubHead key={m.key} />
              ))}
            </tr>
          </thead>
          <tbody>
            {suivi.lignes.length === 0 && (
              <tr>
                <td colSpan={MISSIONS_SUIVI.length * 3 + 5} className="px-4 py-8 text-center text-sm text-slate-400">
                  {readOnly
                    ? 'Aucune ligne de suivi pour ce mois.'
                    : 'Les enseignants de votre répartition apparaissent ici automatiquement — sinon ajoutez-les ci-dessus.'}
                </td>
              </tr>
            )}
            {suivi.lignes.map((l, li) => (
              <tr key={li} className="border-b border-slate-100 hover:bg-slate-50/50">
                <td className="px-2 py-1">
                  <TextInput value={l.nom} readOnly={readOnly} onChange={(v) => updateSuivi((s) => void (s.lignes[li].nom = v))} placeholder="NOM" />
                </td>
                <td className="px-2 py-1">
                  <TextInput value={l.prenom} readOnly={readOnly} onChange={(v) => updateSuivi((s) => void (s.lignes[li].prenom = v))} placeholder="Prénom" />
                </td>
                <td className="px-2 py-1">
                  <TextInput value={l.ecole} readOnly={readOnly} onChange={(v) => updateSuivi((s) => void (s.lignes[li].ecole = v))} placeholder="École" />
                </td>
                {MISSIONS_SUIVI.map((m) => (
                  <SuiviMissionCells key={m.key} ligne={l} missionKey={m.key} readOnly={readOnly} li={li} updateSuivi={updateSuivi} />
                ))}
                <td className="px-2 py-1 text-center text-sm font-bold tabular-nums text-slate-800 border-l border-slate-100">
                  {totalHeuresLigne(l) || ''}
                </td>
                {!readOnly && (
                  <td className="px-1 py-1 text-center">
                    <button
                      onClick={() => updateSuivi((s) => void s.lignes.splice(li, 1))}
                      aria-label={`Supprimer la ligne ${l.nom || li + 1}`}
                      className="p-1.5 text-slate-300 hover:text-rose-600 transition-colors"
                    >
                      <TrashIcon />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          {suivi.lignes.length > 0 && (
            <tfoot>
              <tr className="bg-slate-50/80">
                <td colSpan={3} className="px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] text-slate-600 border-t border-slate-200">Total</td>
                {MISSIONS_SUIVI.map((m) => (
                  <td key={m.key} colSpan={3} className="px-2 py-2 text-center text-sm font-bold tabular-nums text-slate-900 border-t border-l border-slate-200">
                    {suiviStats.heuresParMission[m.key] ? `${suiviStats.heuresParMission[m.key]} h` : ''}
                  </td>
                ))}
                <td className="px-2 py-2 text-center text-sm font-bold tabular-nums text-slate-900 border-t border-l border-slate-200">
                  {suiviStats.totalHeures}
                </td>
                {!readOnly && <td className="border-t border-slate-200" />}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </section>
  );
}

function SuiviSubHead() {
  return (
    <>
      <th className="text-[10px] font-semibold text-slate-500 px-1 py-1 border-b border-l border-slate-200 min-w-[64px]">Heures</th>
      <th className="text-[10px] font-semibold text-slate-500 px-1 py-1 border-b border-slate-200 min-w-[64px]">Élèves</th>
      <th className="text-[10px] font-semibold text-slate-500 px-1 py-1 border-b border-slate-200 min-w-[72px]">Niveau</th>
    </>
  );
}

function SuiviMissionCells({
  ligne,
  missionKey,
  readOnly,
  li,
  updateSuivi,
}: {
  ligne: LigneSuivi;
  missionKey: MissionKey;
  readOnly: boolean;
  li: number;
  updateSuivi: (mut: (s: PacteSuivi) => void) => void;
}) {
  const sm = ligne.missions[missionKey];
  const set = (patch: Partial<{ heures: number; nbEleves: number; niveau: string }>) =>
    updateSuivi((s) => {
      const cur = s.lignes[li].missions[missionKey] ?? { heures: 0, nbEleves: 0, niveau: '' };
      const next = { ...cur, ...patch };
      if (!next.heures && !next.nbEleves && !next.niveau) delete s.lignes[li].missions[missionKey];
      else s.lignes[li].missions[missionKey] = next;
    });
  return (
    <>
      <td className="px-0.5 py-1 border-l border-slate-100">
        <NumCell value={sm?.heures || 0} readOnly={readOnly} decimals onChange={(v) => set({ heures: v })} />
      </td>
      <td className="px-0.5 py-1">
        <NumCell value={sm?.nbEleves || 0} readOnly={readOnly} onChange={(v) => set({ nbEleves: v })} />
      </td>
      <td className="px-0.5 py-1">
        <TextInput value={sm?.niveau || ''} readOnly={readOnly} onChange={(v) => set({ niveau: v })} placeholder="·" center />
      </td>
    </>
  );
}

/* ─── Petits composants partagés ─────────────────────────────────────────── */

function TextInput({
  value,
  onChange,
  readOnly,
  placeholder,
  center,
}: {
  value: string;
  onChange: (v: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  center?: boolean;
}) {
  return (
    <input
      value={value}
      readOnly={readOnly}
      tabIndex={readOnly ? -1 : undefined}
      onChange={(e) => !readOnly && onChange(e.target.value)}
      placeholder={readOnly ? '' : placeholder}
      className={`w-full rounded-md border py-1.5 px-2 text-[13px] outline-none transition-colors ${center ? 'text-center' : ''} ${
        readOnly
          ? 'bg-transparent border-transparent text-slate-700 cursor-default'
          : 'bg-transparent border-transparent text-slate-900 hover:bg-slate-100/70 focus:bg-white focus:ring-2 focus:ring-primary-400'
      }`}
    />
  );
}

function NumCell({
  value,
  onChange,
  readOnly,
  decimals,
}: {
  value: number;
  onChange: (v: number) => void;
  readOnly?: boolean;
  decimals?: boolean;
}) {
  // État local pour laisser passer les saisies intermédiaires ("0," puis "0,5") :
  // un input contrôlé par le nombre seul avalerait le séparateur décimal.
  const [raw, setRaw] = useState(value === 0 ? '' : String(value));
  useEffect(() => {
    setRaw((prev) => {
      const cur = prev === '' ? 0 : Number(prev);
      return cur === value ? prev : value === 0 ? '' : String(value);
    });
  }, [value]);
  return (
    <input
      inputMode={decimals ? 'decimal' : 'numeric'}
      value={raw}
      readOnly={readOnly}
      tabIndex={readOnly ? -1 : undefined}
      onChange={(e) => {
        if (readOnly) return;
        const r = e.target.value.replace(',', '.').replace(decimals ? /[^0-9.]/g : /[^0-9]/g, '');
        setRaw(r);
        const v = r === '' ? 0 : Number(r);
        if (Number.isFinite(v)) onChange(v);
      }}
      onFocus={(e) => !readOnly && e.target.select()}
      placeholder={readOnly ? '' : '·'}
      className={`w-full text-center tabular-nums border rounded-md py-1.5 outline-none transition-colors font-semibold text-[13px] ${
        readOnly
          ? 'bg-transparent border-transparent text-slate-700 cursor-default'
          : 'bg-transparent border-transparent text-slate-900 hover:bg-slate-100/70 focus:bg-white focus:ring-2 focus:ring-primary-400'
      }`}
    />
  );
}

function TopBtn({
  onClick,
  icon,
  label,
  primary,
  disabled,
  disabledTitle,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  primary?: boolean;
  disabled?: boolean;
  disabledTitle?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={disabled ? disabledTitle : undefined}
      aria-disabled={disabled}
      className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all active:translate-y-px ${
        disabled
          ? 'bg-white/5 border border-white/10 text-white/40 cursor-not-allowed'
          : primary
          ? 'bg-white text-primary-700 hover:bg-white/90 shadow-md'
          : 'bg-white/10 backdrop-blur-md border border-white/25 text-white hover:bg-white/20'
      }`}
    >
      <span className="w-4 h-4 inline-flex items-center justify-center">{icon}</span>
      {label}
    </button>
  );
}

/* ─── Icônes ─────────────────────────────────────────────────────────────── */

const iconProps = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

function DownloadIcon() { return <svg {...iconProps}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>; }
function SendIcon() { return <svg {...iconProps}><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>; }
function EditIcon() { return <svg {...iconProps}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>; }
function SpinnerIcon() { return <svg {...iconProps} className="animate-spin"><path d="M21 12a9 9 0 11-6.219-8.56" /></svg>; }
function PlusIcon() { return <svg {...iconProps} width={13} height={13}><path d="M12 5v14M5 12h14" /></svg>; }
function XIcon() { return <svg {...iconProps} width={11} height={11}><path d="M18 6L6 18M6 6l12 12" /></svg>; }
function TrashIcon() { return <svg {...iconProps} width={14} height={14}><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" /></svg>; }
function LockIcon() { return <svg {...iconProps} width={13} height={13} className="text-slate-400"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>; }
function ChevronDownIcon() { return <svg {...iconProps} width={14} height={14}><path d="M6 9l6 6 6-6" /></svg>; }
function ChevronLeftIcon() { return <svg {...iconProps}><path d="M15 18l-6-6 6-6" /></svg>; }
function ChevronRightIcon() { return <svg {...iconProps}><path d="M9 18l6-6-6-6" /></svg>; }
