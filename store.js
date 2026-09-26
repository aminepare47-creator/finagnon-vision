/* =====================================================================
   Finagnon Vision — Store & Base de données Neon
   Accès aux données (Neon Data API + Auth) et modèles de secours.
   ===================================================================== */
(function () {
  // Configuration Neon (Data API + Auth)
  window.FV_NEON = window.FV_NEON || {
    dataApi: "https://ep-frosty-unit-b2ti6pz8.apirest.c-6.eu-central-1.aws.neon.tech/neondb/rest/v1",
    authUrl: "https://ep-frosty-unit-b2ti6pz8.neonauth.c-6.eu-central-1.aws.neon.tech/neondb/auth"
  };

  const N = window.FV_NEON || {};
  const R = !!(N.dataApi && N.authUrl && window.NeonJS);
  const K = t => 'fv_' + t;
  const jget = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  let SB = null;

  // Client Neon : Data API (données) + Auth (gérante / anonyme)
  const sb = () => SB || (SB = NeonJS.createClient({
    auth: { adapter: NeonJS.SupabaseAuthAdapter(), url: N.authUrl, allowAnonymous: true },
    dataApi: { url: N.dataApi }
  }));

  const ok = r => {
    if (r && r.error) throw new Error(r.error.message || 'Erreur base de données');
    return r ? r.data : [];
  };

  // Compression des photos avant envoi
  const shrink = (f, max = 1000) => new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => {
      const k = Math.min(1, max / Math.max(im.width, im.height));
      const c = document.createElement('canvas');
      c.width = im.width * k;
      c.height = im.height * k;
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      c.toBlob(res, 'image/jpeg', .84);
    };
    im.onerror = () => rej(new Error('Image illisible'));
    im.src = URL.createObjectURL(f);
  });
  const dataURL = b => new Promise(r => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(b); });

  window.Store = {
    remote: R,

    defaults: {
      QUARTIER: 'Ouagadougou • Gounghin',
      PHONE_DISPLAY: '+226 65 16 43 94',
      WHATSAPP: '22665164394',
      HOURS: 'Lun - Sam : 08h30 - 19h00',
      FACEBOOK: 'https://www.facebook.com/share/1Bs8J24fV6/',
      TIKTOK: 'https://www.tiktok.com/@finagnonvision',
      EXPEDITION_NOTE: 'Expédition rapide partout au Burkina Faso (Ouagadougou & province)',
      SLOTS_MORNING: '08h30, 09h30, 11h00',
      SLOTS_AFTERNOON: '15h30, 16h30, 18h00'
    },

    async authed() {
      if (!R) return true;
      try { const { data } = await sb().auth.getSession(); return !!(data && data.session); } catch { return false; }
    },

    async login(email, password) {
      if (!R) return;
      const { error } = await sb().auth.signInWithPassword({ email, password });
      if (error) throw new Error(/invalid|password/i.test(error.message || '') ? 'Email ou mot de passe incorrect.' : (error.message || 'Connexion impossible.'));
    },

    async signup(email, password) {
      if (!R) return;
      const { error } = await sb().auth.signUp({ email, password });
      if (error) throw new Error(error.message || 'Création du compte impossible.');
    },

    async user() {
      if (!R) return null;
      try {
        const { data } = await sb().auth.getUser();
        return data && data.user ? data.user : null;
      } catch { return null; }
    },

    async isAdmin() {
      if (!R) return true;
      try {
        const u = await this.user();
        if (!u) return false;
        const r = await sb().from('admins').select('user_id').eq('user_id', u.id);
        return !r.error && !!(r.data && r.data.length);
      } catch { return false; }
    },

    logout() {
      localStorage.removeItem('fv_session');
      if (R) sb().auth.signOut().catch(() => {});
    },

    async list(t, pub) {
      if (R) {
        try {
          let q = sb().from(t).select('*').order('created_at', { ascending: false });
          if (pub) q = q.eq('publie', true);
          const data = ok(await q);
          if (Array.isArray(data) && data.length) return data;
        } catch (e) {
          console.warn('Neon list error, fallback local', e);
        }
      }
      const l = jget(K(t), null) ?? (t === 'lunettes' ? window.FV_SEED : []);
      return pub ? l.filter(x => x.publie !== false) : l;
    },

    async save(t, item) {
      if (R) {
        const b = { ...item };
        delete b.id;
        ok(item.id ? await sb().from(t).update(b).eq('id', item.id) : await sb().from(t).insert(b));
        return;
      }
      const l = await this.list(t);
      if (item.id) { const i = l.findIndex(x => x.id == item.id); l[i] = { ...l[i], ...item }; }
      else l.unshift({ ...item, id: 'l' + Date.now(), created_at: new Date().toISOString() });
      localStorage.setItem(K(t), JSON.stringify(l));
    },

    async remove(t, id) {
      if (R) return void ok(await sb().from(t).delete().eq('id', id));
      localStorage.setItem(K(t), JSON.stringify((await this.list(t)).filter(x => x.id != id)));
    },

    async settings() {
      if (R) {
        try {
          const r = await sb().from('reglages').select('data').eq('id', 1);
          ok(r);
          if (r.data && r.data[0] && r.data[0].data) return r.data[0].data;
        } catch (e) {
          console.warn('Neon settings error, fallback local', e);
        }
      }
      return jget('fv_reglages', {});
    },

    async saveSettings(d) {
      if (R) return void ok(await sb().from('reglages').upsert({ id: 1, data: d }));
      localStorage.setItem('fv_reglages', JSON.stringify(d));
    },

    async upload(file) { return dataURL(await shrink(file)); }
  };

  // 15 montures initiales de départ
  (function () {
    const L = [
      ['Demi-cerclée Or & Rouge', 'Monture métal dorée, verres anti-lumière bleue', 'femme', 'papillon'],
      ['Rectangulaire Gris Mat', 'Monture légère gris mat, branches métal', 'homme', 'rect'],
      ['Écaille Noir & Ambre', 'Acétate noir et écaille ambrée, détails dorés', 'mixte', 'carree'],
      ['Métal Bleu Nuit', 'Fine monture métal bleu nuit, grand confort', 'homme', 'rect'],
      ['Sans cadre Argent', 'Monture sans cadre, branches argentées', 'homme', 'rect'],
      ['Demi-cerclée Browline', 'Style browline rétro argent et noir', 'mixte', 'rect'],
      ['Acétate Écaille Dorée', 'Acétate écaille, finitions dorées soignées', 'mixte', 'rect'],
      ['Browline Noir & Or', 'Arcade noire élégante, cerclage or', 'mixte', 'carree'],
      ['Ronde Noire & Orange', 'Ronde noire contemporaine, embouts orange', 'mixte', 'ronde'],
      ['Rectangulaire Noir & Bleu', 'Noir texturé, branches bleu marine', 'homme', 'rect'],
      ['Sans cadre Bianco', 'Monture aérienne sans cadre, finitions soignées', 'homme', 'rect'],
      ['Carrée Noire Cloutée', 'Acétate noir profond, rivets métalliques', 'mixte', 'carree'],
      ['Fine Noire & Argent', 'Monture épurée noire, branches titane', 'mixte', 'rect'],
      ['Noir & Cristal', 'Bicolore noir et cristal transparent', 'homme', 'carree'],
      ['Carrée Gris Transparent', 'Acétate gris cristal, style tendance', 'mixte', 'carree']
    ];
    window.FV_SEED = L.map((x, i) => ({
      id: 's' + (i + 1),
      nom: x[0],
      description: x[1],
      prix: 16000,
      genre: x[2],
      type: 'bluelight',
      forme: x[3],
      disponible: true,
      image_url: 'images/lunette-' + String(i + 1).padStart(2, '0') + '.jpg'
    }));
  })();
})();
