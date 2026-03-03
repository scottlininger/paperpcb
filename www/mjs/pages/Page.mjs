/**
 * @fileoverview Base class for a Page, which knows how to render the
 *     the site based on some user route.
 */
import pour from '../util/pour.mjs';
import { linkify } from '../util/route.mjs';


export default class Page {
  constructor (site, router) {
    this.site = site;
    pour.context = this;
  }
  
  
  /**
   * A wrapper on pour that assumes you're pouring into the main site panel,
   * and always linkifies.
   */
  async pour (template, values, el) {
  
    if (document.startViewTransition) {
  
      const vt = document.startViewTransition(async () => {
        await pour(el || this.site.panel, template, values);
        linkify();
      });
    
      // Wait for DOM update or animation
      await vt.updateCallbackDone;
    
    } else {
      await pour(el || this.site.panel, template, values);
      linkify();
    }
  }
  
  
  /**
   * Handler for when the user arrive at this page via a route.
   */
  async arrive (router) {
    const routePath = '/ejs/' + router.pathString + '.ejs';
    await this.pour(`
      <%- include('/ejs/header.ejs') %>
      <%- include('${routePath}') %>
      <%- include('/ejs/footer.ejs') %>
    `);
  }
  
  
  /**
   * Handler for when the user leave this view via a route.
   */
  async leave (router) {
    // Will be overridden by subclasses.
  }
}
