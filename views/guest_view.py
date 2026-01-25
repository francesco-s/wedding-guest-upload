import streamlit as st
import base64
from utils.file_ops import save_media, get_files
from components.lightbox import render_lightbox_gallery


def render_guest_interface(username):
    """Renders the complete guest interface"""
    
    # Header
    col1, col2 = st.columns([4, 1])
    col1.markdown(f"### 👋 Ciao, {username}!")
    if col2.button("Esci", key="logout_btn"):
        st.session_state.clear()
        st.rerun()
    
    # Upload Section
    _render_upload_section(username)
    
    st.divider()
    
    # Gallery Section
    _render_gallery_section(username)


def _render_upload_section(username):
    """Renders upload form"""
    with st.expander("📸 Carica Foto / Video", expanded=True):
        uploaded_files = st.file_uploader(
            "Scegli i ricordi...", 
            accept_multiple_files=True, 
            type=['png', 'jpg', 'jpeg', 'mp4', 'mov'],
            label_visibility="collapsed"
        )
        
        is_private = st.toggle("🔒 Mantieni Privato (Solo io e gli sposi)")
        
        if uploaded_files:
            if st.button(f"Carica {len(uploaded_files)} File", type="primary", use_container_width=True):
                progress_bar = st.progress(0)
                
                for idx, file_obj in enumerate(uploaded_files):
                    save_media(file_obj, username, is_public=(not is_private))
                    progress_bar.progress((idx + 1) / len(uploaded_files))
                
                st.success("🎉 Caricamento completato!")
                
                # Switch gallery view
                if is_private:
                    st.session_state.gallery_view = "Il Mio Album Privato"
                else:
                    st.session_state.gallery_view = "Momenti Pubblici"
                
                st.rerun()


def _render_gallery_section(username):
    """Renders photo gallery with lightbox"""
    st.subheader("🖼️ Galleria")
    
    # Initialize state
    if "gallery_view" not in st.session_state:
        st.session_state.gallery_view = "Momenti Pubblici"
    
    # View selector
    view_option = st.radio(
        "Seleziona Vista:", 
        ["Momenti Pubblici", "Il Mio Album Privato"], 
        horizontal=True, 
        label_visibility="collapsed",
        key="gallery_view"
    )
    
    # Get files
    mode = 'public' if st.session_state.gallery_view == "Momenti Pubblici" else 'private'
    gallery_files = get_files(mode, author=username)
    
    if not gallery_files:
        if mode == 'public':
            st.info("Nessuna foto pubblica ancora. Sii il primo!")
        else:
            st.info("Nessuna foto privata ancora. Carica la tua prima foto privata!")
        return
    
    st.caption(f"Totale: {len(gallery_files)} file")
    
    # Prepare images
    images_data = []
    for f in gallery_files:
        if f.suffix.lower() not in ['.mp4', '.mov']:
            with open(f, "rb") as img_file:
                encoded = base64.b64encode(img_file.read()).decode()
                author = ""
                try:
                    author = f.name.split('_')[2]
                except:
                    pass
                images_data.append({
                    'src': f"data:image/{f.suffix[1:]};base64,{encoded}",
                    'author': author,
                    'filename': f.name
                })
    
    # Render lightbox
    lightbox_html = render_lightbox_gallery(
        unique_id="guestgallery",
        images=images_data,
        show_author=(mode == 'public'),
        grid_cols=3
    )
    
    st.components.v1.html(lightbox_html, height=600, scrolling=True)
