export interface Vote {
  categoryId: string;
  firstPlace: string;
  secondPlace: string;
  thirdPlace: string;
  voterId: string;
  timestamp: string;
}

export interface Category {
  id: string;
  label: string;
}

export const CANDIDATES = ['Chicco', 'Lollo', 'Gigi', 'Auri'];

export const CATEGORIES: Category[] = [
  { id: 'simpatico', label: 'Top Simpatico' },
  { id: 'forte_giochi', label: 'Top Forte ai Giochi' },
  { id: 'scarso_giochi', label: 'Top Scarso ai Giochi' },
  { id: 'ragebaiter', label: 'Top Ragebaiter' },
  { id: 'ragebaitabile', label: 'Top Ragebaitabile' },
  { id: 'shotcaller', label: 'Top Shotcaller' },
  { id: 'ritardato', label: 'Top Ritardato' },
  { id: 'ludopatico', label: 'Top Ludopatico' },
  { id: 'take_merda', label: 'Top Take di Merda' },
  { id: 'arresto', label: 'Arresto più Probabile' },
  { id: 'hater_s', label: 'Top Hater di S' },
  { id: 'zombie', label: 'Più Probabile che Sopravviva a un\'Apocalisse Zombie' },
  { id: 'ricco', label: 'Top Più Probabile che Diventi Ricco' },
  { id: 'messicano', label: 'Più Probabile che si Sdiarrei Addosso dopo il Messicano' },
  { id: 'scammato', label: 'Più Probabile che Venga Scammato' },
  { id: 'crimine', label: 'Più Probabile che Commetta un Crimine' },
];
