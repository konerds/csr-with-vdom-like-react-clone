class Router {
  constructor({ mode = 'history', onRoute, routes }) {
    this.routes = routes || [];
    this.onRoute = onRoute || (() => {});
    this.mode = mode === 'hash' ? 'hash' : 'history';

    if (this.mode === 'history') {
      window.addEventListener(
        'popstate',
        (this.handlePopState = this.handlePopState.bind(this))
      );
    } else {
      window.addEventListener(
        'hashchange',
        (this.handleHashChange = this.handleHashChange.bind(this))
      );
    }

    document.addEventListener('click', (event) => {
      const elAnchor = event.target.closest('a[data-link]');

      if (!elAnchor) {
        return;
      }

      const href = elAnchor.getAttribute('href');

      if (!href?.startsWith('/')) {
        return;
      }

      event.preventDefault();
      this.navigate(href);
    });
  }

  getCurrentPath() {
    if (this.mode === 'hash') {
      const path = (window.location.hash || '').replace(/^#/, '') || '/';

      return path.startsWith('/') ? path : `/${path}`;
    }

    return window.location.pathname || '/';
  }

  match(pathname) {
    const segments = pathname.split('/').filter(Boolean);
    let fallback = null;

    for (const route of this.routes) {
      const { handler, path } = route;

      if (path === '*') {
        fallback = { handler, params: {} };
        continue;
      }

      const parts = path.split('/').filter(Boolean);

      if (parts.length !== segments.length) {
        continue;
      }

      let ok = true;
      const params = {};
      const szParts = parts.length;

      for (let i = 0; i < szParts; i++) {
        const p = parts[i];
        const s = segments[i];

        if (p.startsWith(':')) {
          params[p.slice(1)] = decodeURIComponent(s);

          continue;
        }

        if (p !== s) {
          ok = false;

          break;
        }
      }

      if (ok) {
        return { handler, params };
      }
    }

    return fallback;
  }

  navigate(path) {
    if (this.mode === 'hash') {
      const next = path.startsWith('/') ? `#${path}` : `#/${path}`;

      if (window.location.hash !== next) {
        window.location.hash = next;
      }

      this.resolve();

      return;
    }

    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }

    this.resolve();
  }

  handlePopState() {
    this.resolve();
  }

  handleHashChange() {
    this.resolve();
  }

  resolve() {
    const matched = this.match(this.getCurrentPath());

    if (!matched) {
      return;
    }

    const { handler, params = {} } = matched;
    this.onRoute(handler, params);
  }
}

export { Router };
