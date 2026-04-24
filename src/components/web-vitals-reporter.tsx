"use client";

import { useEffect } from "react";
import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from "web-vitals";

type Payload = {
  name: Metric["name"];
  id: string;
  value: number;
  delta: number;
  rating: Metric["rating"];
  navigationType: Metric["navigationType"];
  path: string;
};

function sendMetric(metric: Metric) {
  const payload: Payload = {
    name: metric.name,
    id: metric.id,
    value: Number(metric.value.toFixed(2)),
    delta: Number(metric.delta.toFixed(2)),
    rating: metric.rating,
    navigationType: metric.navigationType,
    path: window.location.pathname,
  };

  const body = JSON.stringify(payload);
  const url = "/api/analytics/web-vitals";

  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: "application/json" });
    navigator.sendBeacon(url, blob);
    return;
  }

  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {
    /* best effort */
  });
}

export function WebVitalsReporter() {
  useEffect(() => {
    onCLS(sendMetric);
    onINP(sendMetric);
    onLCP(sendMetric);
    onFCP(sendMetric);
    onTTFB(sendMetric);
  }, []);

  return null;
}
