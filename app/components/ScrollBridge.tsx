"use client";

import { useFrame } from "@react-three/fiber";
import { useScroll } from "@react-three/drei";
import { scrollState } from "./scrollState";

export function ScrollBridge() {
  const scroll = useScroll();

  useFrame(() => {
    scrollState.offset = scroll.offset;
  });

  return null;
}
