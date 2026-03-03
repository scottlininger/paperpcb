/**
 * @fileoverview A lightweight routing handler for SPA sites. Uses the awesome navigo
 *     library. Google it!
 */
import Navigo from 'https://esm.sh/navigo';
import parseHash from './parseHash.mjs';


export default class Router {
  constructor () {
  
    this.navigo = new Navigo('/', { linksSelector: 'a', strategy: 'ONE' });
    this.navigo.hooks({
      before: (done, match) => {
        if (this.currentHandler && typeof this.currentHandler.leave === 'function') {
          this.lastHandler = this.currentHandler;
          this.lastHandler.leave(this);
        }
        done();
      }
    });
    
    this.handlers = [];
  }

  
  
  /**
   * Wires up handling of a specific route to a specific view. That
   * view is expected to be an object with a .arrive() and .leave()
   * method. These will be called appropriately as the user navigates
   * around the site.
   */
  add (routeSpec, handler) {
    this.handlers.push(handler);
    
    this.navigo.on(routeSpec, (navigoInfo) => {

      // Navigo puts an empty string into params without a value, which
      // means it's falsy, and I prefer that if a param like that is true,
      // So you can do stuff like myPage?showSomething.
      for (const key in navigoInfo.params) {
        if (navigoInfo.params[key] === '') {
          navigoInfo.params[key] = true;
        }
      }
      
      const hashInfo = parseHash();
      this.queryString = navigoInfo.queryString;
      this.query = navigoInfo.params;
      this.pathString = navigoInfo.url;
      this.path = navigoInfo.data || {};

      
      if (handler && typeof handler.arrive === 'function') {
        handler.arrive(this);
      }
      this.currentHandler = handler;    
      
    });
    
  }
  
  /**
   * Asks the router to update based on the current url. Should be called
   * by the parent site after all of the routes have been wired up.
   */
  refresh () {
    
    const lastResolved = this.navigo.lastResolved();
    if (!lastResolved) {
      this.navigo.resolve();
    } else {

  
      let refreshUrl = lastResolved[0].url || location.pathname;
      console.log('refreshUrl', refreshUrl);
      lastResolved[0].url += '?';
      this.navigo.navigate(refreshUrl);
    }
  }
  
 
  /**
   * Wires up all links on the path with click handlers for SPA-ness.
   */ 
  linkify () {
    this.navigo.updatePageLinks();
  }



}

let router = new Router();
function route(routeSpec, handler) {
  return router.add(routeSpec, handler);
}
function refresh() {
  return router.refresh();
}
function linkify() {
  router.linkify();
}
route.refresh = refresh;
route.linkify = linkify;


export { route, refresh, linkify, router };
