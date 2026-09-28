import { useEffect, useState } from 'react';
import api from '../api/client';
import type { Donor } from '../types';

export default function Donors() {
  const [donors, setDonors] = useState<Donor[]>([]);

  useEffect(() => {
    api.get<Donor[]>('/donors')
      .then(res => setDonors(res.data))
      .catch(err => console.error(err));
  }, []);

  return (
    <ul>
      {donors.map(d => <li key={d.id}>{d.name} — {d.bloodGroup}</li>)}
    </ul>
  );
}
