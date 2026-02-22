import streamlit as st
import config
import auth
from views.admin_view import render_admin_dashboard
from views.guest_view import render_guest_interface

# --- App Configuration ---
st.set_page_config(
    page_title=config.APP_TITLE, 
    page_icon=config.APP_ICON, 
    layout="centered"
)

# Initialize Database
auth.init_db()

# Hide Streamlit branding
st.markdown("""
    <style>
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    .stApp {padding-top: 20px;}
    </style>
    """, unsafe_allow_html=True)

# --- AUTHENTICATION ---
if "user" not in st.session_state:
    st.title(f"{config.APP_ICON} {config.APP_TITLE}")
    st.write("Benvenuto! Inserisci il tuo nome per partecipare.")
    
    with st.container(border=True):
        username = st.text_input("Nome (es. Mario)", placeholder="Il tuo nome").strip()
        password = st.text_input("Password", type="password", placeholder="Scegli una password")
        
        if st.button("Entra nell'App", type="primary", use_container_width=True):
            if username and password:
                status, msg, is_admin = auth.login_or_register(username, password)
                
                if status == 'success':
                    st.session_state.user = username
                    st.session_state.is_admin = is_admin
                    st.success(msg)
                    st.rerun()
                else:
                    st.error(msg)
            else:
                st.warning("Inserisci sia il nome che la password.")
    
    st.stop()

# --- ROUTING: Admin or Guest ---
if st.session_state.get("is_admin", False):
    render_admin_dashboard(st.session_state.user)
else:
    render_guest_interface(st.session_state.user)
