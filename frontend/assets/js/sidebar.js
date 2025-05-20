// Script para manter a sidebar sempre visível e funcional
document.addEventListener('DOMContentLoaded', function () {
  const sidebar = document.getElementById('sidebar');
  const mainContent = document.getElementById('mainContent');
  const sidebarToggle = document.getElementById('sidebarToggle');
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');

  // Corrigir título com acento
  const sidebarHeaders = document.querySelectorAll('.sidebar-header h4');
  sidebarHeaders.forEach(header => {
    if (header.textContent.includes('Planeta Agua') || header.textContent.includes('Planeta agua')) {
      header.textContent = 'Planeta Água';
    }
  });

  // Garantir visibilidade da sidebar no desktop
  if (sidebar && sidebar.classList.contains('collapsed')) {
    sidebar.classList.remove('collapsed');
  }

  if (mainContent && mainContent.classList.contains('expanded')) {
    mainContent.classList.remove('expanded');
  }

  // Remover estado salvo
  localStorage.removeItem('sidebarCollapsed');

  // Esconder botão de toggle no desktop
  if (sidebarToggle) {
    sidebarToggle.style.display = 'none';
  }

  // Toggle no mobile
  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', () => {
      sidebar.classList.toggle('mobile-visible');
    });
  }

  // Fechar sidebar no mobile ao clicar fora
  document.addEventListener('click', function (event) {
    if (!sidebar) return;

    const isMobile = window.innerWidth < 992;
    const isClickInsideSidebar = sidebar.contains(event.target);
    const isClickOnMenuBtn = mobileMenuBtn && mobileMenuBtn.contains(event.target);

    if (isMobile && !isClickInsideSidebar && !isClickOnMenuBtn &&
      sidebar.classList.contains('mobile-visible')) {
      sidebar.classList.remove('mobile-visible');
    }
  });

  // Redimensionamento
  window.addEventListener('resize', function () {
    if (!sidebar) return;

    const isMobile = window.innerWidth < 992;

    if (!isMobile) {
      sidebar.classList.remove('mobile-visible', 'collapsed');
      if (mainContent) {
        mainContent.classList.remove('expanded');
      }
    }
  });
});
