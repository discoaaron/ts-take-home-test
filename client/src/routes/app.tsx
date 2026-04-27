import { useEffect, useState } from "react";
import { Header } from "../components/header/header.tsx";
import { Insights } from "../components/insights/insights.tsx";
import styles from "./app.module.css";
import type { Insight } from "../schemas/insight.ts";

export const App = () => {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/insights`)
      .then((res) => res.json())
      .then((data) => setInsights(data));
  }, []);

  const handleAdd = (input: { brand: number; text: string }) => {
    const tempId = Date.now();
    const optimistic: Insight = {
      id: tempId,
      brand: input.brand,
      createdAt: new Date(),
      text: input.text,
    };
    setInsights((prev) => [optimistic, ...prev]);

    fetch("/api/insights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((created) => {
        setInsights((prev) =>
          prev.map((i) =>
            i.id === tempId
              ? { ...created, createdAt: new Date(created.createdAt) }
              : i
          )
        );
      })
      .catch(() => {
        setInsights((prev) => prev.filter((i) => i.id !== tempId));
        setError("Failed to add insight — please try again");
      });
  };

  const handleDelete = (id: number) => {
    const snapshot = insights.find((i) => i.id === id);
    const snapshotIndex = insights.findIndex((i) => i.id === id);
    setInsights((prev) => prev.filter((i) => i.id !== id));

    fetch(`/api/insights/${id}`, { method: "DELETE" })
      .then((res) => {
        if (!res.ok) throw new Error();
      })
      .catch(() => {
        if (snapshot !== undefined) {
          setInsights((prev) => {
            const next = [...prev];
            next.splice(snapshotIndex, 0, snapshot);
            return next;
          });
        }
        setError("Failed to delete insight — please try again");
      });
  };

  return (
    <main className={styles.main}>
      <Header onAdd={handleAdd} />
      {error && <p role="alert" className={styles.error}>{error}</p>}
      <Insights
        className={styles.insights}
        insights={insights}
        onDelete={handleDelete}
      />
    </main>
  );
};

