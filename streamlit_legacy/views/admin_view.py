import streamlit as st
import base64
from utils.file_ops import get_files, get_all_private_users
from components.lightbox import render_lightbox_gallery


def render_admin_dashboard(username):
    """Renders the complete admin dashboard"""
    
    st.title("🕵️ Pannello Amministratore")
    
    # Header
    col_a, col_b = st.columns([4, 1])
    col_a.info(f"Connesso come **{username}** (Amministratore)")
    if col_b.button("Esci"):
        st.session_state.clear()
        st.rerun()
    
    st.divider()
    
    # Public Gallery
    _render_public_gallery()
    
    st.divider()
    
    # Private Folders
    _render_private_folders()
    
    st.stop()


def _render_public_gallery():
    """Renders public photo gallery for admin"""
    st.subheader("🌍 Galleria Pubblica")
    public_files = get_files('public')
    
    if not public_files:
        st.info("Nessuna foto pubblica ancora.")
        return
    
    st.write(f"Totale: **{len(public_files)}** file pubblici")
    
    # Prepare images
    public_images = []
    for f in public_files:
        if f.suffix.lower() not in ['.mp4', '.mov']:
            with open(f, "rb") as img_file:
                encoded = base64.b64encode(img_file.read()).decode()
                author = ""
                try:
                    author = f.name.split('_')[2]
                except:
                    pass
                public_images.append({
                    'src': f"data:image/{f.suffix[1:]};base64,{encoded}",
                    'author': author,
                    'filename': f.name
                })
    
    # Render lightbox
    lightbox_html = render_lightbox_gallery(
        unique_id="adminpublic",
        images=public_images,
        show_author=True,
        grid_cols=4
    )
    
    st.components.v1.html(lightbox_html, height=500, scrolling=True)


def _render_private_folders():
    """Renders private folders for admin"""
    st.subheader("🔒 Cartelle Private")
    users = get_all_private_users()
    
    if not users:
        st.warning("Nessun caricamento privato trovato.")
        return
    
    st.write(f"Totale: **{len(users)}** utenti con caricamenti privati")
    
    for user_idx, user_folder in enumerate(users):
        with st.expander(f"📂 {user_folder}"):
            files = get_files('private', author=user_folder)
            
            if not files:
                st.caption("Cartella vuota.")
                continue
            
            st.write(f"{len(files)} file")
            
            # Prepare images
            private_images = []
            for f in files:
                if f.suffix.lower() not in ['.mp4', '.mov']:
                    with open(f, "rb") as img_file:
                        encoded = base64.b64encode(img_file.read()).decode()
                        private_images.append({
                            'src': f"data:image/{f.suffix[1:]};base64,{encoded}",
                            'filename': f.name
                        })
            
            # Render lightbox
            safe_id = f"priv{user_idx}"
            lightbox_html = render_lightbox_gallery(
                unique_id=safe_id,
                images=private_images,
                show_author=False,
                grid_cols=4
            )
            
            st.components.v1.html(lightbox_html, height=800, scrolling=False)
