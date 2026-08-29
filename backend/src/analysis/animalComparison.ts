interface Animal {
  name: string;
  plural: string;
  weight: number;
  wiki?: string;
}

const ANIMALS: Animal[] = [
  { name: 'ant', plural: 'ants', weight: 0.001, wiki: 'Ant' },
  { name: 'bee', plural: 'bees', weight: 0.1, wiki: 'Bee' },
  { name: 'mouse', plural: 'mice', weight: 0.025, wiki: 'House_mouse' },
  { name: 'hamster', plural: 'hamsters', weight: 0.03, wiki: 'Golden_hamster' },
  { name: 'sparrow', plural: 'sparrows', weight: 0.025, wiki: 'House_sparrow' },
  { name: 'rabbit', plural: 'rabbits', weight: 2.5, wiki: 'European_rabbit' },
  { name: 'housecat', plural: 'housecats', weight: 4, wiki: 'Cat' },
  { name: 'gray squirrel', plural: 'gray squirrels', weight: 0.5, wiki: 'Eastern_gray_squirrel' },
  { name: 'seagull', plural: 'seagulls', weight: 0.4, wiki: 'Herring_gull' },
  { name: 'duck', plural: 'ducks', weight: 1, wiki: 'Mallard' },
  { name: 'goose', plural: 'geese', weight: 3.5, wiki: 'Greylag_goose' },
  { name: 'corgi', plural: 'corgis', weight: 12, wiki: 'Corgi' },
  { name: 'beagle', plural: 'beagles', weight: 10, wiki: 'Beagle' },
  { name: 'cocker spaniel', plural: 'cocker spaniels', weight: 14, wiki: 'Cocker_Spaniel' },
  { name: 'golden retriever', plural: 'golden retrievers', weight: 32, wiki: 'Golden_Retriever' },
  { name: 'labrador retriever', plural: 'labrador retrievers', weight: 36, wiki: 'Labrador_Retriever' },
  { name: 'german shepherd', plural: 'german shepherds', weight: 38, wiki: 'German_Shepherd' },
  { name: 'great dane', plural: 'great danes', weight: 64, wiki: 'Great_Dane' },
  { name: 'peacock', plural: 'peacocks', weight: 4.25, wiki: 'Indian_peafowl' },
  { name: 'turkey', plural: 'turkeys', weight: 9, wiki: 'Wild_turkey' },
  { name: 'sheep', plural: 'sheep', weight: 45, wiki: 'Sheep' },
  { name: 'wolf', plural: 'wolves', weight: 50, wiki: 'Gray_wolf' },
  { name: 'coyote', plural: 'coyotes', weight: 13, wiki: 'Coyote' },
  { name: 'fox', plural: 'foxes', weight: 6, wiki: 'Red_fox' },
  { name: 'otter', plural: 'otters', weight: 7, wiki: 'European_otter' },
  { name: 'seal', plural: 'seals', weight: 60, wiki: 'Harbour_seal' },
  { name: 'badger', plural: 'badgers', weight: 10, wiki: 'Badger' },
  { name: 'raccoon', plural: 'raccoons', weight: 7, wiki: 'Raccoon' },
  { name: 'porcupine', plural: 'porcupines', weight: 18, wiki: 'North_American_porcupine' },
  { name: 'beaver', plural: 'beavers', weight: 20, wiki: 'North_American_beaver' },
  { name: 'marmot', plural: 'marmots', weight: 3, wiki: 'Groundhog' },
  { name: 'woodchuck', plural: 'woodchucks', weight: 4, wiki: 'Groundhog' },
  { name: 'moose', plural: 'moose', weight: 600, wiki: 'Moose' },
  { name: 'deer', plural: 'deer', weight: 80, wiki: 'Deer' },
  { name: 'reindeer', plural: 'reindeer', weight: 100, wiki: 'Reindeer' },
  { name: 'elk', plural: 'elk', weight: 250, wiki: 'Elk' },
  { name: 'bison', plural: 'bison', weight: 600, wiki: 'American_bison' },
  { name: 'wild boar', plural: 'wild boar', weight: 100, wiki: 'Wild_boar' },
  { name: 'bear', plural: 'bears', weight: 200, wiki: 'Bear' },
  { name: 'polar bear', plural: 'polar bears', weight: 600, wiki: 'Polar_bear' },
  { name: 'tiger', plural: 'tigers', weight: 260, wiki: 'Tiger' },
  { name: 'lion', plural: 'lions', weight: 190, wiki: 'Lion' },
  { name: 'zebra', plural: 'zebras', weight: 350, wiki: 'Zebra' },
  { name: 'giraffe', plural: 'giraffes', weight: 1200, wiki: 'Giraffe' },
  { name: 'rhino', plural: 'rhinos', weight: 2300, wiki: 'Rhinoceros' },
  { name: 'hippopotamus', plural: 'hippopotami', weight: 1500, wiki: 'Hippopotamus' },
  { name: 'elephant', plural: 'elephants', weight: 6000, wiki: 'African_elephant' },
  { name: 'whale', plural: 'whales', weight: 100000, wiki: 'Blue_whale' },
  { name: 'shark', plural: 'sharks', weight: 2000, wiki: 'Great_white_shark' },
  { name: 'salmon', plural: 'salmon', weight: 4, wiki: 'Atlantic_salmon' },
  { name: 'trout', plural: 'trout', weight: 1, wiki: 'Rainbow_trout' },
  { name: 'pike', plural: 'pike', weight: 3, wiki: 'Northern_pike' },
  { name: 'catfish', plural: 'catfish', weight: 5, wiki: 'Catfish' },
  { name: 'carp', plural: 'carp', weight: 3, wiki: 'Common_carp' },
  { name: 'ostrich', plural: 'ostriches', weight: 130, wiki: 'Ostrich' },
  { name: 'emu', plural: 'emus', weight: 55, wiki: 'Emu' },
  { name: 'penguin', plural: 'penguins', weight: 40, wiki: 'Emperor_penguin' },
  { name: 'eagle', plural: 'eagles', weight: 5, wiki: 'Bald_eagle' },
  { name: 'vulture', plural: 'vultures', weight: 7, wiki: 'Bearded_vulture' },
  { name: 'crocodile', plural: 'crocodiles', weight: 350, wiki: 'Saltwater_crocodile' },
  { name: 'alligator', plural: 'alligators', weight: 200, wiki: 'American_alligator' },
  { name: 'python', plural: 'pythons', weight: 80, wiki: 'Reticulated_python' },
  { name: 'cobra', plural: 'cobras', weight: 2, wiki: 'Cobra' },
  { name: 'frog', plural: 'frogs', weight: 0.1, wiki: 'Frog' },
  { name: 'toad', plural: 'toads', weight: 0.3, wiki: 'Toad' },
  { name: 'tortoise', plural: 'tortoises', weight: 300, wiki: 'Tortoise' },
  { name: 'turtle', plural: 'turtles', weight: 50, wiki: 'Turtle' },
  { name: 'chimpanzee', plural: 'chimpanzees', weight: 60, wiki: 'Chimpanzee' },
  { name: 'gorilla', plural: 'gorillas', weight: 180, wiki: 'Western_gorilla' },
  { name: 'orangutan', plural: 'orangutans', weight: 80, wiki: 'Orangutan' },
  { name: 'monkey', plural: 'monkeys', weight: 5, wiki: 'Monkey' },
  { name: 'lemur', plural: 'lemurs', weight: 1, wiki: 'Ring-tailed_lemur' },
  { name: 'koala', plural: 'koalas', weight: 10, wiki: 'Koala' },
  { name: 'kangaroo', plural: 'kangaroos', weight: 55, wiki: 'Red_kangaroo' },
  { name: 'panda', plural: 'pandas', weight: 100, wiki: 'Giant_panda' },
  { name: 'sloth', plural: 'sloths', weight: 4, wiki: 'Sloth' },
  { name: 'anteater', plural: 'anteaters', weight: 30, wiki: 'Giant_anteater' },
  { name: 'platypus', plural: 'platypuses', weight: 2, wiki: 'Platypus' },
  { name: 'echidna', plural: 'echidnas', weight: 4, wiki: 'Short-beaked_echidna' },
];

export function getAnimalComparison(weight: number): Animal | null {
  if (weight <= 0) return null;

  let closest = ANIMALS[0];
  let closestDiff = Math.abs(ANIMALS[0].weight - weight);

  for (const animal of ANIMALS) {
    const diff = Math.abs(animal.weight - weight);
    if (diff < closestDiff) {
      closestDiff = diff;
      closest = animal;
    }
  }

  return closest;
}
