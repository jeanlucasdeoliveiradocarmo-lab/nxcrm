"use client";

import { useEffect, useRef, useState } from "react";
import {
  Timestamp,
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getTimestampInMillis, parseCurrencyToCents } from "@/lib/crm";

const STATUS_ALIASES = {
  novo: "novo",
  "novo lead": "novo",
  atendimento: "atendimento",
  "em atendimento": "atendimento",
  orcamento: "orcamento",
  orçamento: "orcamento",
  "orçamento enviado": "orcamento",
  fechado: "fechado",
  "venda fechada": "fechado",
  perdido: "perdido",
};

function normalizeStatus(value) {
  const normalized = String(value || "novo").trim().toLocaleLowerCase("pt-BR");
  return STATUS_ALIASES[normalized] || "novo";
}

function normalizeBudget(data) {
  const cents = Number(data.valorOrcamentoCentavos);
  if (Number.isInteger(cents) && cents >= 0) return cents;
  return data.valor == null ? 0 : parseCurrencyToCents(data.valor);
}

function normalizeLead(leadDocument) {
  const data = leadDocument.data();

  return {
    ...data,
    id: leadDocument.id,
    nome: String(data.nome || "Lead sem nome").trim(),
    email: String(data.email || "").trim().toLowerCase(),
    telefone: String(data.telefone || "").trim(),
    status: normalizeStatus(data.status),
    valorOrcamentoCentavos: normalizeBudget(data),
    moeda: data.moeda || "BRL",
    tarefas: Array.isArray(data.tarefas) ? data.tarefas : [],
    createdAt: data.createdAt || data.timestamp || Timestamp.now(),
  };
}

export function useLeads(clientId) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(Boolean(clientId));
  const [error, setError] = useState("");
  const [newLeadToast, setNewLeadToast] = useState(null);
  const initialSnapshotRef = useRef(true);

  useEffect(() => {
    if (!newLeadToast) return undefined;
    const timeout = window.setTimeout(() => setNewLeadToast(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [newLeadToast]);

  useEffect(() => {
    if (!clientId) {
      setLeads([]);
      setLoading(false);
      return undefined;
    }

    initialSnapshotRef.current = true;
    setLoading(true);
    setError("");

    const leadsQuery = query(
      collection(db, "leads"),
      where("clienteId", "==", clientId),
    );

    const unsubscribe = onSnapshot(
      leadsQuery,
      (snapshot) => {
        const addedAfterInitialLoad = !initialSnapshotRef.current
          ? snapshot.docChanges().filter((change) => change.type === "added")
          : [];

        const nextLeads = snapshot.docs
          .map(normalizeLead)
          .sort(
            (leadA, leadB) =>
              getTimestampInMillis(leadB.createdAt) -
              getTimestampInMillis(leadA.createdAt),
          );

        setLeads(nextLeads);
        setLoading(false);
        setError("");

        if (addedAfterInitialLoad.length > 0) {
          const newestLead = normalizeLead(
            addedAfterInitialLoad[addedAfterInitialLoad.length - 1].doc,
          );
          setNewLeadToast({
            id: `${newestLead.id}:${Date.now()}`,
            message: "Novo Lead recebido do site!",
            leadName: newestLead.nome,
          });
        }

        initialSnapshotRef.current = false;
      },
      (firestoreError) => {
        console.error("Erro no listener de leads:", firestoreError);
        setError("Não foi possível sincronizar os leads em tempo real.");
        setLoading(false);
      },
    );

    return () => {
      unsubscribe();
    };
  }, [clientId]);

  return {
    leads,
    loading,
    error,
    setError,
    newLeadToast,
    dismissNewLeadToast: () => setNewLeadToast(null),
  };
}
