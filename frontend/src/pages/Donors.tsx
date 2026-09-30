import { useEffect, useState } from 'react';
import api from '../api/client';
import type { DonorSummary } from '../types';

export default function Donors() {
  const [donors, setDonors] = useState<DonorSummary[]>([]);

  useEffect(() => {
    api.get<DonorSummary[]>('/donors')
      .then(res => setDonors(res.data))
      .catch(err => console.error(err));
  }, []);

  return (
    <ul>
      {donors.map(d => <li key={d.id}>{d.name} — {d.bloodGroup}</li>)}
    </ul>
  );
}
