#!/usr/bin/env python
# -*- coding: utf-8 -*-

from twisted.web.static import File
from twisted.enterprise import adbapi
from klein import Klein
import json

app = Klein()

dbpool = adbapi.ConnectionPool("pymysql",
  host='database-db-instance.cvtysiszh5lk.ap-northeast-1.rds.amazonaws.com',
  port=3306,
  user='web',
  passwd='hervdb508',
  db='Graph_db',
  charset='utf8')

main_html = "".join(list(open("main.html")))
main_js = "".join(list(open("main.js")))
plotly = "".join(list(open("plotly.min.js")))
style_css = "".join(list(open("style.css")))

herv_list_json = "".join(list(open("herv_list.json")))

@app.route("/")
def pg_main(request):
  return main_html

@app.route("/main.js")
def js_main(request):
  return main_js

@app.route("/plotly.min.js")
def js_plotly(request):
  return plotly

@app.route("/style.css")
def css(request):
  return style_css

@app.route("/herv_list")
def herv_list(request):
  return herv_list_json

def convert_json(l):
  res = []
  for t in l:
    d = {}
    d["name"] = t[0]
    d["y"] = map(int, t[1].split(","))
    d["mode"] = "line"
    res.append(d)
  return json.dumps(res)

@app.route("/graph_data/tfbs_depth/<herv_name>")
def tbfs_depth(request, herv_name):
  query = 'SELECT T.TF, D.Depth FROM(HERV_TFBS_Id AS HT NATURAL JOIN TFBS_Id AS T) NATURAL JOIN TFBS_depth AS D WHERE HT.HERV="%s" AND HT.HCREs="%s" AND T.Project REGEXP "%s" AND HT.Z_score >= %s ORDER BY HT.Z_score DESC LIMIT %s;'
  query = query % (str(herv_name), "Yes", "Roadmap|ENCODE", "3", "10")
  d = dbpool.runQuery(query)
  d.addCallback(convert_json)
  return d
  
@app.route("/graph_data/motif_depth/<herv_name>")
def motif_depth(request, herv_name):
  query = 'SELECT T.TF, D.Depth FROM(HERV_TFBS_Id AS HT NATURAL JOIN TFBS_Id AS T) NATURAL JOIN Motif_depth AS D WHERE HT.HERV="%s" AND HT.HCREs="%s" AND T.Project REGEXP "%s" AND HT.Z_score >= %s ORDER BY HT.Z_score DESC LIMIT %s ;'
  query = query % (str(herv_name), "Yes", "Roadmap|ENCODE", "3", "10")
  d = dbpool.runQuery(query)
  d.addCallback(convert_json)
  return d

def dhs_convert_json(l):
  res = []
  for t in l:
    d = {}
    d["name"] = t[0].replace("UniPk","")
    d["y"] = [ int(i) for i in t[1].split(",") ]
    res.append(d)
  return json.dumps(res)
@app.route("/graph_data/dhs_depth/<herv_name>")
def dhs_depth(request, herv_name):
  rep = "No"
  z_score = "3"
  threshold = "10"
  if rep == "Yes":
    query = 'SELECT DHS_data, Depth FROM DHS_depth WHERE HERV="%s" AND DHS_Data IN ("UwdukeGm12878UniPk","UwdukeH1hescUniPk","UwdukeK562UniPk","UwdukeHepg2UniPk","UwdukeHelas3UniPk","UwdukeHuvecUniPk","UwdukeA549UniPk","UwdukeMcf7UniPk") AND Z_score >= %s ORDER BY Z_score DESC LIMIT %s;'
  else:
    query = 'SELECT DHS_data, Depth FROM DHS_depth WHERE HERV="%s" AND Z_score >= %s ORDER BY Z_score DESC LIMIT %s;'
  query = query % (str(herv_name), threshold, z_score)
  d = dbpool.runQuery(query)
  d.addCallback(dhs_convert_json)
  return d

app.run("ilabws03.lab.nig.ac.jp", 8080)
