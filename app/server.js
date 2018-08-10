import sirv from 'sirv';
import polka from 'polka';
import sapper from 'sapper';
import compression from 'compression';
import { Store } from 'svelte/store.js';
import { manifest } from './manifest/server.js';

polka() // You can also use Express
	.use(
		compression({ threshold: 0 }),
		sirv('assets'),
		sapper({
      manifest,
      store: request => new Store({
        center: [11.94, 57.7],
        zoom: 12,
        waypoints: []
      })
    })
	)
	.listen(process.env.PORT)
	.catch(err => {
		console.log('error', err);
	})
