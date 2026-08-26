"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getTimestampInMillis } from "@/lib/crm";

export function useLeads(clientId) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(Boolean(clientId));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!clientId) {
      setLeads([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    setError("");

    const leadsQuery = query(
      collection(db, "leads"),
      where("clienteId", "==", clientId),
    );

    return onSnapshot(
      leadsQuery,
      (snapshot) => {
        const nextLeads = snapshot.docs
          .map((leadDocument) => ({
            id: leadDocument.id,
            ...leadDocument.data(),
            status: leadDocument.data().status || "novo",
          }))
          .sort(
            (leadA, leadB) =>
              getTimestampInMillis(leadB.createdAt) -
              getTimestampInMillis(leadA.createdAt),
          );

        setLeads(nextLeads);
        setLoading(false);
        setError("");
      },
      (firestoreError) => {
        console.error("Erro no listener de leads:", firestoreError);
        setError("Não foi possível sincronizar os leads em tempo real.");
        setLoading(false);
      },
    );
  }, [clientId]);

  return { leads, loading, error, setError };
}
