export interface SoraVideo {
  id: number;
  prompt: string;
  videoUrl: string;
}

export const soraFeedData: SoraVideo[] = [
  {
    id: 1,
    prompt: "A stylish woman walks down a Tokyo street filled with warm glowing neon and animated city signage. She wears a black leather jacket, a long red dress, and black boots, and carries a black purse.",
    videoUrl: "https://storage.googleapis.com/aistudio-hosting/sora-prompter/tokyo-walk.mp4"
  },
  {
    id: 2,
    prompt: "Photorealistic closeup video of two pirate ships battling in a cup of coffee.",
    videoUrl: "https://storage.googleapis.com/aistudio-hosting/sora-prompter/pirate-battle.mp4"
  },
  {
    id: 3,
    prompt: "A movie trailer featuring the adventures of a 30-year-old space man wearing a red wool knitted motorcycle helmet, blue sky, salt desert, cinematic style, shot on 35mm film, vivid colors.",
    videoUrl: "https://storage.googleapis.com/aistudio-hosting/sora-prompter/spaceman-trailer.mp4"
  },
  {
    id: 4,
    prompt: "Animated scene features a close-up of a short fluffy monster kneeling beside a melting red candle. The art style is 3D and realistic, with a focus on lighting and texture.",
    videoUrl: "https://storage.googleapis.com/aistudio-hosting/sora-prompter/fluffy-monster.mp4"
  },
  {
    id: 5,
    prompt: "Drone view of waves crashing against the rugged cliffs along Big Sur’s garay point beach. The crashing blue waters create white foam against the rocky coast.",
    videoUrl: "https://storage.googleapis.com/aistudio-hosting/sora-prompter/big-sur.mp4"
  }
];
