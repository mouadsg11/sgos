package com.sgos.personal;

import android.content.ContentValues;
import android.content.Context;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.provider.MediaStore;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/**
 * Ce que la WebView Android ne sait pas faire seule :
 *  - printHtml : imprimer une page (rapport hebdomadaire) avec le service d'impression
 *    d'Android, qui propose « Enregistrer au format PDF » ;
 *  - saveFile : enregistrer un fichier texte (sauvegarde des données, source .tex)
 *    dans le dossier Téléchargements.
 */
@CapacitorPlugin(name = "SgosNative")
public class SgosNativePlugin extends Plugin {

    private WebView printView;   // gardée jusqu'à la fin de l'impression

    @PluginMethod
    public void printHtml(PluginCall call) {
        String html = call.getString("html");
        String name = call.getString("name", "SGOS");
        if (html == null) { call.reject("html manquant"); return; }
        getActivity().runOnUiThread(() -> {
            WebView w = new WebView(getActivity());
            w.setWebViewClient(new WebViewClient() {
                @Override
                public void onPageFinished(WebView view, String url) {
                    // laisser le temps aux polices intégrées d'être appliquées
                    view.postDelayed(() -> {
                        PrintManager pm = (PrintManager) getActivity().getSystemService(Context.PRINT_SERVICE);
                        PrintDocumentAdapter adapter = view.createPrintDocumentAdapter(name);
                        pm.print(name, adapter, new PrintAttributes.Builder()
                                .setMediaSize(PrintAttributes.MediaSize.ISO_A4).build());
                        call.resolve();
                    }, 400);
                }
            });
            printView = w;
            w.loadDataWithBaseURL("https://localhost/", html, "text/html", "UTF-8", null);
        });
    }

    @PluginMethod
    public void saveFile(PluginCall call) {
        String name = call.getString("name");
        String content = call.getString("content", "");
        String mime = call.getString("mime", "application/octet-stream");
        if (name == null || name.contains("/") || name.contains("\\")) { call.reject("nom de fichier invalide"); return; }
        byte[] bytes = content.getBytes(StandardCharsets.UTF_8);
        try {
            String where;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContentValues v = new ContentValues();
                v.put(MediaStore.Downloads.DISPLAY_NAME, name);
                v.put(MediaStore.Downloads.MIME_TYPE, mime);
                v.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/SGOS");
                Uri uri = getContext().getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, v);
                if (uri == null) throw new Exception("création du fichier impossible");
                try (OutputStream o = getContext().getContentResolver().openOutputStream(uri)) { o.write(bytes); }
                where = "Téléchargements/SGOS/" + name;
            } else {
                // Android 7 à 9 : dossier propre à l'application (pas de permission à demander)
                File dir = new File(getContext().getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), "SGOS");
                if (!dir.exists() && !dir.mkdirs()) throw new Exception("dossier impossible à créer");
                File f = new File(dir, name);
                try (OutputStream o = new FileOutputStream(f)) { o.write(bytes); }
                where = f.getAbsolutePath();
            }
            JSObject r = new JSObject();
            r.put("path", where);
            call.resolve(r);
        } catch (Exception e) {
            call.reject(e.getMessage());
        }
    }
}
