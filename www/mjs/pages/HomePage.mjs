/**
 * @fileoverview Homepage.
 */
import Page from './Page.mjs';
import { linkify } from '../util/route.mjs';


export default class HomePage extends Page {
  
  constructor (site, router) {
    super(site, router);
  }
  
  
  /**
   * Show the page.
   */
  async arrive (router) {
    
    
    await this.pour(`
      <%- include('/ejs/header.ejs') %>
      <%- include('/ejs/home.ejs') %>
      <%- include('/ejs/footer.ejs') %>
    `);
  }
  
  
  /**
   * Cleanup if needed.
   */
  async leave (router) {
    
  }
}