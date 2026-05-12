export function Footer() {
  return (
    <footer className="app-footer" role="contentinfo">
      <p className="app-footer-line">
        Card data and images provided by{' '}
        <a
          href="https://scryfall.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          Scryfall
        </a>
        .
      </p>
      <p className="app-footer-line app-footer-disclaimer">
        Portions of the materials used are property of Wizards of the Coast.
        ©Wizards of the Coast LLC. This is unofficial Fan Content not
        approved/endorsed by Wizards.
      </p>
    </footer>
  )
}
