import type { Layout } from "./types";
export const scenarios: {
  id: string;
  title: string;
  subtitle: string;
  layout: Layout;
}[] = [
  {
    id: "exhibition",
    title: "Exhibition hall",
    subtitle: "Exhibit islands & a narrow exit",
    layout: {
      name: "Exhibition hall",
      obstacles: [
        { id: "a", label: "Exhibit A", x: 6, y: 3.6, w: 4.2, h: 4.2 },
        { id: "b", label: "Exhibit B", x: 6, y: 13.2, w: 4.2, h: 4.2 },
        { id: "c", label: "Exhibit C", x: 15, y: 3.6, w: 4.2, h: 4.2 },
        { id: "d", label: "Exhibit D", x: 15, y: 13.2, w: 4.2, h: 4.2 },
        { id: "desk", label: "Welcome desk", x: 25.2, y: 8.4, w: 2.4, h: 4.8 },
      ],
      exits: [
        {
          id: "east",
          label: "Main exit",
          side: "east",
          center: 10.8,
          width: 1.2,
        },
        {
          id: "south",
          label: "Side exit",
          side: "south",
          center: 12.6,
          width: 1.2,
        },
      ],
    },
  },
  {
    id: "terminal",
    title: "Station terminal",
    subtitle: "Long platforms & two concourse exits",
    layout: {
      name: "Station terminal",
      obstacles: [
        { id: "p1", label: "Platform 1", x: 7.2, y: 4.2, w: 16.8, h: 2.4 },
        { id: "p2", label: "Platform 2", x: 7.2, y: 10.2, w: 16.8, h: 2.4 },
        { id: "p3", label: "Platform 3", x: 7.2, y: 16.2, w: 16.8, h: 2.4 },
      ],
      exits: [
        {
          id: "east",
          label: "Concourse exit",
          side: "east",
          center: 10.8,
          width: 1.8,
        },
        {
          id: "west",
          label: "Street exit",
          side: "west",
          center: 10.8,
          width: 1.2,
        },
      ],
    },
  },
  {
    id: "concert",
    title: "Concert venue",
    subtitle: "A stage, mixing desk & rear exits",
    layout: {
      name: "Concert venue",
      obstacles: [
        { id: "stage", label: "Main stage", x: 1.2, y: 5.4, w: 6, h: 10.8 },
        { id: "sound", label: "Sound desk", x: 19.2, y: 8.4, w: 4.2, h: 4.8 },
        { id: "bar", label: "Bar", x: 12.6, y: 1.2, w: 9.6, h: 1.8 },
      ],
      exits: [
        {
          id: "east",
          label: "Rear exit A",
          side: "east",
          center: 6,
          width: 1.2,
        },
        {
          id: "south",
          label: "Rear exit B",
          side: "south",
          center: 27.6,
          width: 1.2,
        },
      ],
    },
  },
];
export const copyLayout = (layout: Layout): Layout => structuredClone(layout);
export function improveLayout(layout: Layout): Layout {
  const next = copyLayout(layout);
  next.exits = next.exits.map((exit) => ({
    ...exit,
    width: Math.max(exit.width, 3.6),
  }));
  return next;
}
