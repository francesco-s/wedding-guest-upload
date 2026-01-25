def get_lightbox_styles(unique_id):
    """Returns CSS styles for lightbox component"""
    return f"""
        .gallery-{unique_id} {{
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
            margin: 10px 0;
        }}
        .gallery-{unique_id} img {{
            width: 100%;
            height: 120px;
            object-fit: cover;
            cursor: pointer;
            border-radius: 6px;
            transition: transform 0.2s;
        }}
        .gallery-{unique_id} img:hover {{
            transform: scale(1.05);
        }}
        
        .lb-{unique_id} {{
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0,0,0,0.95);
            z-index: 9999;
            align-items: center;
            justify-content: center;
        }}
        .lb-{unique_id}.active {{
            display: flex !important;
        }}
        .lb-{unique_id} img {{
            max-width: 90vw;
            max-height: 85vh;
            object-fit: contain;
        }}
        .lb-{unique_id} .lb-close {{
            position: absolute;
            top: 20px;
            right: 30px;
            font-size: 50px;
            color: white;
            cursor: pointer;
            z-index: 10001;
            text-shadow: 0 0 10px rgba(0,0,0,0.8);
        }}
        .lb-{unique_id} .lb-nav {{
            position: absolute;
            top: 50%;
            font-size: 60px;
            color: white;
            cursor: pointer;
            user-select: none;
            padding: 20px;
            background: rgba(0,0,0,0.5);
            border-radius: 50%;
            text-shadow: 0 0 15px rgba(0,0,0,0.9);
            transition: background 0.3s;
        }}
        .lb-{unique_id} .lb-nav:hover {{
            background: rgba(0,0,0,0.8);
        }}
        .lb-{unique_id} .lb-prev {{ left: 20px; }}
        .lb-{unique_id} .lb-next {{ right: 20px; }}
        .lb-{unique_id} .lb-footer {{
            position: absolute;
            bottom: 0;
            width: 100%;
            padding: 20px;
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 15px;
            background: linear-gradient(transparent, rgba(0,0,0,0.8));
        }}
        .lb-{unique_id} .lb-btn {{
            background: white;
            color: black;
            padding: 10px 20px;
            border-radius: 25px;
            text-decoration: none;
            font-weight: bold;
            display: flex;
            align-items: center;
            gap: 5px;
            cursor: pointer;
            font-family: sans-serif;
            border: none;
            font-size: 14px;
        }}
        .lb-{unique_id} .lb-btn:hover {{
            background: #e0e0e0;
        }}
        .lb-{unique_id} .lb-info {{
            color: white;
            text-align: center;
            font-size: 16px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.8);
            font-family: sans-serif;
        }}
    """


def get_lightbox_script(unique_id, images_var_name):
    """Returns JavaScript for lightbox navigation"""
    return f"""
        (function() {{
            const images = {images_var_name};
            let currentIdx = 0;
            
            window.open{unique_id} = function(i) {{
                currentIdx = i;
                show{unique_id}();
                document.getElementById('lb-{unique_id}').classList.add('active');
            }};
            
            window.close{unique_id} = function() {{
                if (document.fullscreenElement) {{
                    document.exitFullscreen();
                }}
                document.getElementById('lb-{unique_id}').classList.remove('active');
            }};
            
            window.change{unique_id} = function(direction) {{
                currentIdx += direction;
                if (currentIdx < 0) currentIdx = images.length - 1;
                if (currentIdx >= images.length) currentIdx = 0;
                show{unique_id}();
            }};
            
            function show{unique_id}() {{
                const img = images[currentIdx];
                document.getElementById('lb-{unique_id}-img').src = img.src;
                document.getElementById('lb-{unique_id}-counter').innerText = (currentIdx + 1) + ' di ' + images.length;
                
                const author = img.author || '';
                const authorDiv = document.getElementById('lb-{unique_id}-author');
                if (authorDiv) {{
                    authorDiv.innerText = author ? '📸 Di: ' + author : '';
                }}
                
                const dlBtn = document.getElementById('lb-{unique_id}-dl');
                dlBtn.href = img.src;
                dlBtn.download = img.filename;
            }}
            
            window.fullscreen{unique_id} = function() {{
                const elem = document.getElementById('lb-{unique_id}');
                if (!document.fullscreenElement) {{
                    elem.requestFullscreen();
                }} else {{
                    document.exitFullscreen();
                }}
            }};
            
            document.addEventListener('keydown', function(e) {{
                if (document.getElementById('lb-{unique_id}').classList.contains('active')) {{
                    if (e.key === 'Escape') window.close{unique_id}();
                    if (e.key === 'ArrowLeft') window.change{unique_id}(-1);
                    if (e.key === 'ArrowRight') window.change{unique_id}(1);
                }}
            }});
        }})();
    """


def render_lightbox_gallery(unique_id, images, show_author=True, grid_cols=4):
    """
    Renders complete lightbox gallery HTML
    
    Args:
        unique_id: Unique identifier for this gallery
        images: List of dicts with 'src', 'filename', 'author' keys
        show_author: Whether to show author name
        grid_cols: Number of columns in grid (3 or 4)
    """
    
    # Gallery grid
    gallery_html = f'<div class="gallery-{unique_id}">'
    for i, img in enumerate(images):
        gallery_html += f'<img src="{img["src"]}" onclick="open{unique_id}({i})">'
    gallery_html += '</div>'
    
    # Lightbox overlay
    author_div = f'<div id="lb-{unique_id}-author"></div>' if show_author else ''
    
    lightbox_html = f"""
    <div class="lb-{unique_id}" id="lb-{unique_id}">
        <span class="lb-close" onclick="close{unique_id}()">&times;</span>
        <span class="lb-nav lb-prev" onclick="change{unique_id}(-1)">&#10094;</span>
        <img id="lb-{unique_id}-img" src="">
        <span class="lb-nav lb-next" onclick="change{unique_id}(1)">&#10095;</span>
        
        <div class="lb-footer">
            <div class="lb-info">
                <div id="lb-{unique_id}-counter"></div>
                {author_div}
            </div>
            <button onclick="fullscreen{unique_id}()" class="lb-btn">
                ⛶ Fullscreen
            </button>
            <a id="lb-{unique_id}-dl" class="lb-btn" download>
                📥 Scarica
            </a>
        </div>
    </div>
    """
    
    # Update grid columns style
    styles = get_lightbox_styles(unique_id).replace(
        "repeat(4, 1fr)", 
        f"repeat({grid_cols}, 1fr)"
    )
    
    # Complete HTML
    complete_html = f"""
    <style>{styles}</style>
    {gallery_html}
    {lightbox_html}
    <script>{get_lightbox_script(unique_id, images)}</script>
    """
    
    return complete_html
