/**
 * @fileoverview A generic docs page.
 */
import Page from './Page.mjs';
import { linkify } from '../util/route.mjs';
import nav from '../nav.mjs';


export default class DocsPage extends Page {
  
  constructor (site, router) {
    super(site, router);
    this.nav = nav;
  }
  
  
  /**
   * Show the page.
   */
  async arrive (router) {
    const currentPath = '/' + router.pathString;
    const routePath = '/ejs' + currentPath + '.ejs';
    this.currentLink = nav.linksByPath[currentPath];
    this.currentChapter = nav.chaptersByPath[currentPath];
        
    await this.pour(`
      <%- include('/ejs/header.ejs') %>
      
      <main class="container has-table-of-contents page-index docs-page">
        <%- include('/ejs/nav.ejs') %>
       <hgroup>
          <p class="chapter"><%= this.currentChapter.label %></p>
          <h1><%= this.currentLink.label %></h1>
          <P></P>
        </hgroup>
        <aside id="table-of-contents">
          <nav class="is-sticky-above-lg ">
            <details open="">
              <summary>Jump to</summary>
              <ul id="toc-panel">
              </ul>
            </details>
          </nav>
        </aside>
    
        <style>
        pre {
          min-height: 200px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
    
        </style>
    
        <div id="content" role="document">
          <%- include('${routePath}') %>
          
          
          <section class="edit-on-github">
          <p>
            <a rel="noopener noreferrer" class="secondary" href="https://github.com/scottlininger/paperpcb/blob/main/www/ejs<%=this.currentLink.path%>.ejs" target="_blank">
              <small>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round" class="icon-edit">
                  <path d="M7 7h-1a2 2 0 0 0 -2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2 -2v-1"></path>
                  <path d="M20.385 6.585a2.1 2.1 0 0 0 -2.97 -2.97l-8.415 8.385v3h3l8.385 -8.415z"></path>
                  <path d="M16 5l3 3"></path>
                </svg>
                Edit this page on GitHub
              </small>
            </a>
          </p>
        </section>
        </div>
      </main>
      
      <%- include('/ejs/footer.ejs') %>
    `);
    
    // Populate the table of contents panel with H2s hash links.
    let tocPanel = document.getElementById('toc-panel');
    let contentPanel = document.getElementById('content');
    if (tocPanel && contentPanel) {
      let h2s = contentPanel.querySelectorAll('h2');
      let html = '';
      for (const h2 of h2s) {
        const innerText = h2.innerText;
        const cleanLinkLabel = innerText.replace(/\d\.\s/, '');
        const id = this.toValidId(innerText);
        h2.innerHTML += `<a href="#${id}" id="${id}" class="secondary" tabindex="-1">#</a>`;
        
        html += `
          <li><a class="secondary" data-discover="true" href="#${id}">${cleanLinkLabel}</a></li>
        `;
        
      }
      tocPanel.innerHTML = html;
      
      this.scrollObserver = null;

      const navLinks = tocPanel.querySelectorAll('a[href^="#"]');
      const linkMap = new Map();

      navLinks.forEach(link => {
        const id = link.getAttribute('href').slice(1);
        linkMap.set(id, link);
      });

      this.scrollObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;

          navLinks.forEach(l => {
            l.removeAttribute('aria-current');
          });
          
          let a = entry.target.querySelectorAll('a')[0];

          const link = linkMap.get(a.id);
          if (link) {
            link.setAttribute('aria-current', 'page');
          }
        });
      }, {
        //rootMargin: "0px 0px 0px 0px"
        rootMargin: "-10% 0px -30% 0px"
      });

      h2s.forEach(h2 => {
        this.scrollObserver.observe(h2);
      });
      
    }
    window.scrollTo(0, 0);
  }
  
  
  /**
   * Cleanup if needed.
   */
  async leave (router) {
    if (this.scrollObserver) {
      this.scrollObserver.disconnect();
      this.scrollObserver = null;
    }
  }
  
  
  /**
   * Creates a valid html ID from any string.
   */
  toValidId(str) {
    if (!str) return 'id';

    let id = str
      .toLowerCase()
      .normalize('NFD')                   // remove accents
      .replace(/[\u0300-\u036f]/g, '')    // strip diacritics
      .replace(/\s+/g, '-')               // spaces → dash
      .replace(/[^a-z0-9\-_]/g, '')       // remove unsafe chars
      .replace(/-+/g, '-')                // collapse multiple dashes
      .replace(/^-|-$/g, '');             // trim leading/trailing dash

    // Prevent starting with number
    if (/^[0-9]/.test(id)) {
      id = 'id-' + id;
    }

    // Ensure not empty
    if (!id) {
      id = 'id';
    }

    return id;
  }

}