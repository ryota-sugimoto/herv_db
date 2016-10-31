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

def get_params(request):
  d = {}
  hcre = request.args.get("hcre", ["false"])[0]
  if hcre == "true":
    d["hcre"] = "Yes"
  elif hcre == "false":
    d["hcre"] = "No"
  else:
    d["hcre"] = "Yes"
  
  z_score = request.args.get("z_score", ["3"])[0]
  try:
    d["z_score"] = str(float(z_score))
  except ValueError:
    d["z_score"] =" 3"
  
  db = request.args.get("db", ["Roadmap|ENCODE"])[0]
  if db == "Roadmap|ENCODE" or db == "Roadmap" or db == "ENCODE":
    d["db"] = db
  else:
    d["db"] = "Roadmap|ENCODE"
  
  limit = request.args.get("limit", ["10"])[0]
  if limit.isdigit() and int(limit) >= 0:
    d["limit"] = limit
  else:
    d["limit"] = "10"
  
  return d

@app.route("/static/<file_name>")
def static(request, file_name):
  return File("./static/"+file_name)

main_html = "".join(list(open("static/main.html")))
@app.route("/")
def pg_main(request):
  return main_html

def convert_json(l):
  res = []
  for t in l:
    d = {}
    d["name"] = t[0]
    d["y"] = map(int, t[1].split(","))
    d["mode"] = "line"
    res.append(d)
  res.append({"name": "dummy", "y": [], "mode": "line", "showlegend": "False"})
  return json.dumps(res)
@app.route("/graph_data/tfbs_depth/<herv_name>")
def tbfs_depth(request, herv_name):
  query = 'SELECT T.TF, D.Depth FROM(HERV_TFBS_Id AS HT NATURAL JOIN TFBS_Id AS T) NATURAL JOIN TFBS_depth AS D WHERE HT.HERV="%s" AND HT.HCREs="%s" AND T.Project REGEXP "%s" AND HT.Z_score >= %s ORDER BY HT.Z_score DESC LIMIT %s;'
  params = get_params(request)
  query = query % (str(herv_name), params["hcre"],
                                   params["db"],
                                   params["z_score"],
                                   params["limit"])
  d = dbpool.runQuery(query)
  d.addCallback(convert_json)
  return d
  
@app.route("/graph_data/motif_depth/<herv_name>")
def motif_depth(request, herv_name):
  query = 'SELECT T.TF, D.Depth FROM(HERV_TFBS_Id AS HT NATURAL JOIN TFBS_Id AS T) NATURAL JOIN Motif_depth AS D WHERE HT.HERV="%s" AND HT.HCREs="%s" AND T.Project REGEXP "%s" AND HT.Z_score >= %s ORDER BY HT.Z_score DESC LIMIT %s ;'
  params = get_params(request)
  query = query % (str(herv_name), params["hcre"],
                                   params["db"],
                                   params["z_score"],
                                   params["limit"])
  d = dbpool.runQuery(query)
  d.addCallback(convert_json)
  return d

def dhs_convert_json(l):
  res = []
  for t in l:
    d = {}
    d["name"] = t[0].replace("UniPk","")
    d["y"] = [ int(i) for i in t[1].split(",") ]
    d["mode"] = "line"
    res.append(d)
  return json.dumps(res)
@app.route("/graph_data/dhs_depth/<herv_name>")
def dhs_depth(request, herv_name):
  rep = "No"
  if rep == "Yes":
    query = 'SELECT DHS_data, Depth FROM DHS_depth WHERE HERV="%s" AND DHS_Data IN ("UwdukeGm12878UniPk","UwdukeH1hescUniPk","UwdukeK562UniPk","UwdukeHepg2UniPk","UwdukeHelas3UniPk","UwdukeHuvecUniPk","UwdukeA549UniPk","UwdukeMcf7UniPk") AND Z_score >= %s ORDER BY Z_score DESC LIMIT %s;'
  else:
    query = 'SELECT DHS_data, Depth FROM DHS_depth WHERE HERV="%s" AND Z_score >= %s ORDER BY Z_score DESC LIMIT %s;'
  params = get_params(request)
  query = query % (str(herv_name), params["z_score"], params["limit"])
  d = dbpool.runQuery(query)
  d.addCallback(dhs_convert_json)
  return d

def chromatin_state_json(l):
  res = []
  for t in l:
    d = {}
    d["name"] = t[0]
    d["x"] = ["TSS", "PF", "E", "WE", "CTCF", "T", "R"]
    d["y"] = [ float(i) for i in t[1].split(",") ]
    d["type"] = "bar"
    res.append(d)
  return json.dumps(res)
@app.route("/graph_data/chromatin_state/<herv_name>")
def chromatin_state_depth(request, herv_name):
  query = 'SELECT Cell, States FROM Chromatin_state WHERE HERV="%s";'
  query = query % (str(herv_name),)
  d = dbpool.runQuery(query)
  d.addCallback(chromatin_state_json)
  return d

def ortholog_map_json(t):
  s = t[0][0]
  res = { "type": "heatmap",
          "colorscale": [[0, "white"], [1,"black"]],
          "showscale": False }

  res["x"] = ["Chimpanzee", "Gorilla", "Orangutan", "Gibon", "Rhesus",
              "Marmoset", "Tarsier", "Mouse lemur", "Mouse", "Cow", "Dog"]
  res["y"] = []
  res["z"] = []
  for i,ss in enumerate(s.split("|")):
    l = ss.split(",")
    res["y"].append(i)
    res["z"].append(map(int,l[1:]))
  return json.dumps([res])
@app.route("/graph_data/ortholog/<herv_name>")
def ortholog_graph(request, herv_name):
  query = 'SELECT Locus_Ortholog FROM Ortholog_with_phylogeny WHERE HERV="%s";'
  query = query % (str(herv_name),)
  d = dbpool.runQuery(query)
  d.addCallback(ortholog_map_json)
  return d

def TFBS_map_json(t):
  res = { "type": "heatmap",
          "colorscale": [[0, "white"], [1,"red"]],
          "showscale": False }
  n_x = len(t)
  n_y = len(t[0][1].split(","))
  res["x"] = [x for x,z in t]
  res["y"] = range(n_y)
  res["z"] = [[0] * n_x for _ in range(n_y)]
  for ix,(_,zz) in enumerate(t):
    zz = map(int, zz.split(","))
    for iy,z in enumerate(zz):
      res["z"][iy][ix] = z
  return json.dumps([res])
@app.route("/graph_data/TFBS_phylogeny/<herv_name>")
def TFBS_phylogeny_graph(request, herv_name):
  query = 'SELECT T.TF, TB.TF_binding FROM(HERV_TFBS_Id AS HT NATURAL JOIN TFBS_Id AS T) NATURAL JOIN TFBS_with_phylogeny AS TB WHERE HT.HERV="%s" AND HT.HCREs="%s" AND T.Project REGEXP "%s" AND HT.Z_score >= %s ORDER BY HT.Z_score DESC LIMIT %s ;'
  params = get_params(request)
  query = query % (str(herv_name), params["hcre"],
                                   params["db"],
                                   params["z_score"],
                                   params["limit"])
  d = dbpool.runQuery(query)
  d.addCallback(TFBS_map_json)
  return d

def motif_map_json(t):
  res = { "type": "heatmap",
          "colorscale": [[0, "white"], [1,"black"]],
          "showscale": False }
  n_x = len(t)
  n_y = len(t[0][2].split(","))
  res["x"] = [x1+x2 for x1,x2,_ in t]
  res["y"] = range(n_y)
  res["z"] = [[0] * n_x for _ in range(n_y)]
  for ix,(_,_,zz) in enumerate(t):
    zz = map(float, zz.split(","))
    for iy,z in enumerate(zz):
      res["z"][iy][ix] = z
  return json.dumps([res])
@app.route("/graph_data/motif_phylogeny/<herv_name>")
def motif_phylogeny_graph(request, herv_name):
  query = 'SELECT T.TF, M.Motif_Id, Phy.P_value FROM((( Motif_with_phylogeny AS Phy NATURAL JOIN Motif_Id AS M) NATURAL JOIN HCREs_Id AS HC) NATURAL JOIN HERV_TFBS_Id AS HT) NATURAL JOIN TFBS_Id AS T WHERE HT.HERV="%s" AND T.Project REGEXP "%s" AND HT.Z_score >= %s ORDER BY HT.Z_score DESC ;'
  params = get_params(request)
  query = query % (str(herv_name), params["db"], params["z_score"])
  d = dbpool.runQuery(query)
  d.addCallback(motif_map_json)
  return d

app.run("ilabws03.lab.nig.ac.jp", 8080)
