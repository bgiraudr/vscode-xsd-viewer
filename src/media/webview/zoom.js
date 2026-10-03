export const view = { 
    scale: 1, 
    x: 0, 
    y: 0, 
    isPanning: false, 
    panStartX: 0, 
    panStartY: 0, 
    hasDragged: false, 
    dragStartX: 0, 
    dragStartY: 0 
};

/**
 * Applique la transformation de translation et d'échelle sur le conteneur du graphe.
 * @param graphEl : Élément DOM SVG/Graphe
 */
export const applyTransform = (graphEl) => {
    graphEl.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.scale})`;
};

/**
 * Applique un zoom centré sur les coordonnées spécifiées.
 * @param graphEl : Élément DOM SVG/Graphe
 * @param factor : Facteur de zoom à appliquer
 * @param mouseX : Coordonnée X du point d'origine du zoom
 * @param mouseY : Coordonnée Y du point d'origine du zoom
 */
export const zoomAtPoint = (graphEl, factor, mouseX, mouseY) => {
    const originX = (mouseX - view.x) / view.scale;
    const originY = (mouseY - view.y) / view.scale;
    view.scale = Math.min(Math.max(0.1, view.scale * factor), 10);
    view.x = mouseX - originX * view.scale;
    view.y = mouseY - originY * view.scale;
    applyTransform(graphEl);
};

/**
 * Zoome au centre du conteneur d'affichage.
 * @param container : Élément conteneur du graphe
 * @param graphEl : Élément DOM SVG/Graphe
 * @param factor : Facteur de zoom
 */
export const zoomAtContainerCenter = (container, graphEl, factor) => {
    const { width, height } = container.getBoundingClientRect();
    zoomAtPoint(graphEl, factor, width / 2, height / 2);
};

/**
 * Réinitialise le niveau de zoom et la position du graphe à l'origine.
 * @param graphEl : Élément DOM SVG/Graphe
 */
export const resetZoom = (graphEl) => {
    Object.assign(view, { scale: 1, x: 0, y: 0 });
    applyTransform(graphEl);
};

/**
 * Attache l'ensemble des écouteurs d'événements pour le zoom et le déplacement.
 * @param container : Conteneur principal du graphe
 * @param graphEl : Élément SVG du graphe
 * @param zoomInBtn : Bouton de zoom avant
 * @param zoomOutBtn : Bouton de zoom arrière
 * @param resetBtn : Bouton de réinitialisation
 */
export const initZoomEvents = (container, graphEl, zoomInBtn, zoomOutBtn, resetBtn) => {
    container.addEventListener('wheel', event => {
        event.preventDefault();
        const { left, top } = container.getBoundingClientRect();
        zoomAtPoint(graphEl, event.deltaY < 0 ? 1.15 : 1 / 1.15, event.clientX - left, event.clientY - top);
    }, { passive: false });

    container.addEventListener('mousedown', event => {
        if (event.button !== 0) return;
        Object.assign(view, {
            isPanning: true,
            hasDragged: false,
            dragStartX: event.clientX,
            dragStartY: event.clientY,
            panStartX: event.clientX - view.x,
            panStartY: event.clientY - view.y
        });
    });

    window.addEventListener('mousemove', event => {
        if (!view.isPanning) return;
        if (Math.hypot(event.clientX - view.dragStartX, event.clientY - view.dragStartY) > 5) {
            view.hasDragged = true;
        }
        view.x = event.clientX - view.panStartX;
        view.y = event.clientY - view.panStartY;
        applyTransform(graphEl);
    });

    window.addEventListener('mouseup', () => { view.isPanning = false; });

    zoomInBtn?.addEventListener('click', () => zoomAtContainerCenter(container, graphEl, 1.25));
    zoomOutBtn?.addEventListener('click', () => zoomAtContainerCenter(container, graphEl, 1 / 1.25));
    resetBtn?.addEventListener('click', () => resetZoom(graphEl));
};