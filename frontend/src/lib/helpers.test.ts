import { describe, expect, it } from 'vitest';
import { BLOOD_GROUPS } from '../types';
import { compatibleDonorGroups } from './bloodGroups';
import { formatBloodGroup, formatDate } from './format';
import { notificationLink, timeAgo } from './notifications';
import { safeRedirectPath } from './redirect';
import { matchesQuery } from './search';
import { ageOn } from './validation';

describe('compatibleDonorGroups (must match the backend and README table)', () => {
  it('O− can only receive O−, AB+ can receive from everyone', () => {
    expect(compatibleDonorGroups('O-')).toEqual(['O-']);
    expect([...compatibleDonorGroups('AB+')].sort()).toEqual([...BLOOD_GROUPS].sort());
  });

  it('lists the exact group first', () => {
    for (const group of BLOOD_GROUPS) {
      expect(compatibleDonorGroups(group)[0]).toBe(group);
    }
  });

  it('never gives Rh+ blood to an Rh− recipient', () => {
    for (const group of BLOOD_GROUPS.filter((g) => g.endsWith('-'))) {
      expect(compatibleDonorGroups(group).every((donor) => donor.endsWith('-'))).toBe(true);
    }
  });
});

describe('safeRedirectPath (where to go after sign-in)', () => {
  it('accepts paths on this site', () => {
    expect(safeRedirectPath('/donor/requests')).toBe('/donor/requests');
  });

  it('refuses anything that could leave the site', () => {
    for (const from of [null, '', 'https://evil.example', '//evil.example', '/\\evil.example', 'donor']) {
      expect(safeRedirectPath(from)).toBeNull();
    }
  });
});

describe('matchesQuery (table search)', () => {
  it('needs every word, ignoring case and order', () => {
    expect(matchesQuery('kamal colombo', 'Kamal Perera', 'Colombo')).toBe(true);
    expect(matchesQuery('KAMAL kandy', 'Kamal Perera', 'Colombo')).toBe(false);
  });

  it('matches phone numbers ignoring spaces and dashes', () => {
    expect(matchesQuery('077 123', '0771234567')).toBe(true);
    expect(matchesQuery('077-123-4567', '0771234567')).toBe(true);
  });

  it('an empty search matches everything', () => {
    expect(matchesQuery('   ', 'anything')).toBe(true);
  });
});

describe('ageOn (the 18–60 donor rule counts whole years like the backend)', () => {
  const today = new Date(2026, 8, 30); // 30 Sep 2026

  it('turns a year older on the birthday, not before', () => {
    expect(ageOn('2008-09-30', today)).toBe(18);
    expect(ageOn('2008-10-01', today)).toBe(17);
    expect(ageOn('1965-10-01', today)).toBe(60);
  });
});

describe('formatting', () => {
  it('shows a true minus sign in blood groups', () => {
    expect(formatBloodGroup('AB-')).toBe('AB−');
    expect(formatBloodGroup('O+')).toBe('O+');
  });

  it('reads a date as a calendar day, whatever the time zone', () => {
    expect(formatDate('2026-05-01')).toBe('1 May 2026');
  });
});

describe('notifications', () => {
  const aboutRequest = { id: 1, message: '', read: false, createdAt: '', requestId: 12, reference: 'RQ-12' };
  const aboutNothing = { ...aboutRequest, requestId: null, reference: null };

  it('opens the request for staff and the donor’s requests page for donors', () => {
    expect(notificationLink(aboutRequest, 'HOSPITAL_STAFF')).toBe('/hospital/requests/12');
    expect(notificationLink(aboutRequest, 'DONOR')).toBe('/donor/requests#RQ-12');
    expect(notificationLink(aboutRequest, 'ADMIN')).toBe('/admin/hospitals');
    expect(notificationLink(aboutNothing, 'HOSPITAL_STAFF')).toBe('/hospital');
  });

  it('says how long ago in plain words', () => {
    const now = new Date('2026-10-06T12:00:00Z').getTime();
    expect(timeAgo('2026-10-06T11:59:30Z', now)).toBe('Just now');
    expect(timeAgo('2026-10-06T11:55:00Z', now)).toBe('5 min ago');
    expect(timeAgo('2026-10-06T09:00:00Z', now)).toBe('3 h ago');
    expect(timeAgo('2026-10-05T12:00:00Z', now)).toBe('1 day ago');
  });
});
