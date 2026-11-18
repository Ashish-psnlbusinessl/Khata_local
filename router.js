import { useEffect, useState } from 'react';

// Tiny hash router: #/customers, #/customers/<id>, #/bahi, #/history, #/settings
// Hash routing works on GitHub Pages and inside the Android app, and the phone's back button works.
const parse = () => {
  const h = window.location.hash.replace(/^#\/?/, '');
  const [name, id] = h.split('/');
  return { name: name || 'customers', id: id || null };
};

export function useHashRoute() {
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    const onChange = () => setRoute(parse());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

export const go = (path) => {
  window.location.hash = '/' + path;
};

export const back = () => {
  if (window.history.length > 1) window.history.back();
  else go('customers');
};
